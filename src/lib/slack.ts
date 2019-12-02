import QueryString from 'querystring'

import Axios from 'axios'
import { getConfigVar } from '@spalger/micro-plus'

import { Log, getRequestLogger } from './log'
import { makeContextCache } from './req_cache'
import { isAxiosErrorResp } from './axios_errors'

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

export class SlackApi {
  basicAuth =
    'basic ' +
    Buffer.from(
      `${getConfigVar('SLACK_CLIENT_ID')}:${getConfigVar(
        'SLACK_CLIENT_SECRET',
      )}`,
      'utf8',
    ).toString('base64')

  x = Axios.create({
    baseURL: 'https://slack.com/api/',
  })

  constructor(private readonly log: Log, private readonly webhookUrl: string) {}

  public async pingAtHere(msg: string) {
    await this.send(`<!here|here> ${slackEscape(msg)}`)
  }

  public async finishOauth(code: string, redirectUri?: string) {
    return await Axios.request<any>({
      url: 'oauth.access',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: this.basicAuth,
      },
      data: QueryString.stringify({
        code,
        redirect_uri: redirectUri,
        single_channel: false,
      }),
    })
  }

  private async send(escapedText: string) {
    try {
      await Axios.request({
        url: this.webhookUrl,
        method: 'POST',
        data: {
          text: escapedText,
        },
      })
    } catch (error) {
      if (isAxiosErrorResp(error)) {
        this.log.error('slack error response', {
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

      this.log.error('failed to send request to slack', {
        '@type': 'slackWebhookFailure',
        data: {
          msg: escapedText,
          error: error.stack || error.message || error,
        },
      })
    }
  }
}

const slackApiCache = makeContextCache('github api', ctx => {
  return new SlackApi(getRequestLogger(ctx), getConfigVar('SLACK_WEBHOOK_URL'))
})

export const getSlackApi = slackApiCache.get
