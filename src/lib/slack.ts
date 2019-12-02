import QueryString from 'querystring'
import Iron from '@hapi/iron'
import { Client } from '@elastic/elasticsearch'

import Axios from 'axios'
import { getConfigVar } from '@spalger/micro-plus'

import { scrollSearch } from './es'
import { attemptMapAll } from './async_iterators'
import { Log, getRequestLogger } from './log'
import { makeContextCache } from './req_cache'
import { isAxiosErrorResp, createAxiosErrorResp } from './axios_errors'
import { getEsClient } from './es'

/**
 * required escaping per slack api docs
 * https://api.slack.com/docs/message-formatting#3_characters_you_must_encode_as_html_entities
 */
const FORBIDDEN_CHAR_RE = /&|<|>/g
function replaceForbiddenChar(match: string) {
  switch (match) {
    case '&':
      return '&amp;'
    case '<':
      return '&lt;'
    case '>':
      return '&gt;'
    default:
      throw new Error(`how did ${FORBIDDEN_CHAR_RE.source} match ${match}?`)
  }
}

function slackEscape(msg: string) {
  return msg.replace(FORBIDDEN_CHAR_RE, replaceForbiddenChar)
}

function has<T extends string>(
  x: any,
  key: T,
): x is { [k in typeof key]: any } {
  return (
    x && typeof x === 'object' && Object.prototype.hasOwnProperty.call(x, key)
  )
}

function isObj(x: any): x is object {
  return x && typeof x === 'object'
}

function isString(x: any): x is string {
  return x && typeof x === 'object'
}

type CredDoc = {
  created_at: string
  payload: string
}

export class SlackApi {
  private readonly credsIndex: string
  private readonly basicAuth: string
  private readonly encrypt: (data: unknown) => Promise<string>
  private readonly decrypt: <T = unknown>(data: string) => Promise<T>

  constructor(
    private readonly log: Log,
    private readonly es: Client,
    config: {
      credsIndex: string
      clientId: string
      clientSecret: string
      credsPassword: {
        readonly id: string
        readonly secret: string
      }
    },
  ) {
    this.credsIndex = config.credsIndex

    this.basicAuth =
      'basic ' +
      Buffer.from(`${config.clientId}:${config.clientSecret}`, 'utf8').toString(
        'base64',
      )

    this.encrypt = async (data: unknown) => {
      return await Iron.seal(data, config.credsPassword, Iron.defaults)
    }
    this.decrypt = async (sealed: string) => {
      return await Iron.unseal(sealed, config.credsPassword, Iron.defaults)
    }
  }

  public async finishOauth(code: string, redirectUri?: string) {
    const formData = QueryString.stringify({
      code,
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
      single_channel: false,
    })

    this.log.info('finishing slack oauth', {
      '@type': 'slackOauthComplete',
      data: {
        code,
        redirectUri,
        formData,
      },
    })

    let response
    try {
      response = await Axios.request<
        | {
            ok: false
            error: string
          }
        | {
            ok: true
            access_token: string
            scope: string
            user_id: string
            team_id: string
            enterprise_id?: string
            team_name: string
            incoming_webhook: {
              channel: string
              channel_id: string
              configuration_url: string
              url: string
            }
          }
      >({
        url: 'https://slack.com/api/oauth.access',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: this.basicAuth,
        },
        data: formData,
      })

      if (response.data.ok !== true) {
        throw createAxiosErrorResp(response, response.data.error)
      }
    } catch (error) {
      if (isAxiosErrorResp(error)) {
        this.log.error('failed to finish slack oauth', {
          '@type': 'slackOauthComplete-FailureResponse',
          data: {
            config: error.config,
            status: error.response.status,
            headers: error.response.headers,
            resp: error.response.data,
          },
        })
      } else {
        this.log.error('failed to send request to slack', {
          '@type': 'slackOauthComplete-RequestFailure',
          data: {
            error: error.stack || error.message || error,
          },
        })
      }

      throw error
    }

    await this.es.index({
      index: this.credsIndex,
      id: response.data.team_name,
      body: {
        created_at: new Date().toJSON(),
        payload: await this.encrypt(response.data),
      } as CredDoc,
    })

    return response.data
  }

  private async sendToWebhook(escapedText: string, webhookUrl: string) {
    try {
      await Axios.request({
        url: webhookUrl,
        method: 'POST',
        data: {
          text: escapedText,
        },
      })
    } catch (error) {
      if (isAxiosErrorResp(error)) {
        this.log.error('send to slack webhook: failure response', {
          '@type': 'slackWebhookFailure',
          data: {
            msg: escapedText,
            status: error.response.status,
            headers: error.response.headers,
            resp: error.response.data,
          },
        })
        return
      }

      this.log.error('send to slack webhook: request failure', {
        '@type': 'slackWebhookFailure',
        data: {
          msg: escapedText,
          error: error.stack || error.message || error,
        },
      })
    }
  }

  private getIncomingWebhookUrl(decryptedCreds: unknown) {
    if (
      has(decryptedCreds, 'incoming_webhook') &&
      isObj(decryptedCreds.incoming_webhook)
    ) {
      if (
        has(decryptedCreds.incoming_webhook, 'url') &&
        isString(decryptedCreds.incoming_webhook.url)
      ) {
        return decryptedCreds.incoming_webhook.url
      }
    }

    return undefined
  }

  public async broadcast(msg: string) {
    this.log.info('Broadcasting msg to all slack webhooks', {
      '@type': 'slackBroadcast',
      data: {
        msg,
      },
    })

    const failures = await attemptMapAll(
      scrollSearch<CredDoc>(this.es, {
        index: this.credsIndex,
      }),

      async ({ payload }) => {
        const creds = this.decrypt(payload)
        const webhookUrl = this.getIncomingWebhookUrl(creds)

        if (!webhookUrl) {
          return
        }

        await this.sendToWebhook(slackEscape(msg), webhookUrl)
      },
    )

    for (const failure of failures) {
      this.log.error('Slack broadcast failure', {
        '@type': 'slackBroadcastFailure',
        data: {
          ...failure.error,
        },
      })
    }
  }
}

const slackApiCache = makeContextCache('github api', ctx => {
  return new SlackApi(getRequestLogger(ctx), getEsClient(ctx), {
    credsIndex: getConfigVar('SLACK_CREDS_INDEX'),
    clientId: getConfigVar('SLACK_CLIENT_ID'),
    clientSecret: getConfigVar('SLACK_CLIENT_SECRET'),
    credsPassword: JSON.parse(getConfigVar('SLACK_CREDS_PASSWORD')),
  })
})

export const getSlackApi = slackApiCache.get
