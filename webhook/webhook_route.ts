import * as Crypto from 'crypto'
import { Writable, pipeline } from 'stream'
import { promisify } from 'util'
import humaizeDuration from 'humanize-duration'

import {
  Route,
  getConfigVar,
  UnauthorizedError,
  ServerError,
} from '@spalger/micro-plus'

import { GithubApi } from './github_api'

const pipelineAsync = promisify(pipeline)
const WEBHOOK_SECRET = getConfigVar('GITHUB_WEBHOOK_SECRET')
const BRANCH_REF_TAG = 'refs/heads/'

const RELEVANT_PR_ACTIONS = ['opened', 'synchronize']

export function makeWebhookRoute(githubApi: GithubApi) {
  return new Route('POST', '/webhook', async ctx => {
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
      console.log('INVALID WEBHOOK SIGNATURE %j', {
        signature,
        expectedSignature,
      })
      throw new UnauthorizedError('invalid webhook signature')
    }

    const event = ctx.header('X-GitHub-Event')
    const webhook = JSON.parse(body)

    switch (event) {
      case 'push':
        const { ref } = webhook
        if (!ref.startsWith(BRANCH_REF_TAG)) {
          return {
            body: {
              ignored: true,
              reason: 'not a branch?',
            },
          }
        }

        const branch = ref.replace(BRANCH_REF_TAG, '')
        return {
          body: {
            branch,
          },
        }

      case 'pull_request':
        const { number, action, pull_request: pr } = webhook

        if (!RELEVANT_PR_ACTIONS.includes(action)) {
          return {
            body: {
              ignored: true,
              reason: 'irrelevant action',
            },
          }
        }

        const compare = await githubApi.compare(pr.head.sha, pr.base.label)
        let latestCommitDate: Date | void
        let timeBehind: number | void
        let timeBehindHuman: string | void

        if (compare.oldestMissingCommitDate) {
          latestCommitDate = await githubApi.getCommitDate(pr.base.ref)
          timeBehind =
            latestCommitDate.valueOf() -
            compare.oldestMissingCommitDate.valueOf()
          timeBehindHuman = humaizeDuration(timeBehind, {
            units: ['d', 'h'],
            maxDecimalPoints: 1,
          })
        }

        return {
          body: {
            number,
            state: pr.state,
            latestCommitDate,
            timeBehindHuman,
            ...compare,
          },
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
