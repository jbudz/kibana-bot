import * as Crypto from 'crypto'
import { Writable, pipeline } from 'stream'
import { promisify } from 'util'

import {
  Route,
  getConfigVar,
  UnauthorizedError,
  ServerError,
} from '@spalger/micro-plus'

import { getRequestLogger } from '../lib'
import { GithubApi } from './github_api'
import { GithubApiPr } from './github_api_types'
import { checkPr } from './check_pr'

const pipelineAsync = promisify(pipeline)
const WEBHOOK_SECRET = getConfigVar('GITHUB_WEBHOOK_SECRET')
const BRANCH_REF_TAG = 'refs/heads/'

const RELEVANT_PR_ACTIONS = ['opened', 'synchronize']

interface PrWebhook {
  action: string
  pull_request: GithubApiPr
}

export function makeWebhookRoute(githubApi: GithubApi) {
  return new Route('POST', '/webhook', async ctx => {
    const log = getRequestLogger(ctx)

    let body = ''
    const hmac = Crypto.createHmac('sha1', WEBHOOK_SECRET)

    await pipelineAsync(
      ctx.request,
      new Writable({
        write(chunk, _, cb) {
          try {
            body += chunk
            hmac.update(chunk)
            cb()
          } catch (error) {
            cb(error)
          }
        },
      }),
    )

    const signature = ctx.header('X-Hub-Signature')
    const expectedSignature = `sha1=${hmac.digest('hex')}`
    if (expectedSignature !== signature) {
      log.warn('invalid webhook signature', {
        signature,
        expectedSignature,
      })

      throw new UnauthorizedError('invalid webhook signature')
    }

    const event = ctx.header('X-GitHub-Event')
    const webhook = JSON.parse(body)
    log.info(`received webhook [${event}]`, {
      event,
      data: {
        webhook,
      },
    })

    switch (event) {
      case 'push':
        const { ref } = webhook
        if (!ref.startsWith(BRANCH_REF_TAG)) {
          log.warn(
            `ignoring push webhook for something that doesn't seem to be a branch`,
            {
              ref,
            },
          )
          return {
            body: {
              ignored: true,
              reason: 'not a branch?',
            },
          }
        }

        const branch = ref.replace(BRANCH_REF_TAG, '')
        log.info(`received push event for branch [${branch}]`, {
          branch,
        })

        return {
          body: {
            branch,
          },
        }

      case 'pull_request':
        const { action, pull_request: pr } = webhook as PrWebhook

        const relevant = RELEVANT_PR_ACTIONS.includes(action)
        log.info('received pull_request webhook', {
          action,
          relevant,
          prNumber: pr.number,
        })

        if (!relevant) {
          return {
            body: {
              ignored: true,
              reason: 'irrelevant action',
            },
          }
        }

        return {
          body: await checkPr(log, githubApi, pr),
        }

      case 'ping':
        return {
          statusCode: 200,
          body: {
            ignored: true,
          },
        }

      default:
        throw new ServerError(`unhandled event [${event}]`)
    }
  })
}
