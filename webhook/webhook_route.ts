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

import { GithubApi, isAxiosErrorResp } from './github_api'

const pipelineAsync = promisify(pipeline)
const WEBHOOK_SECRET = getConfigVar('GITHUB_WEBHOOK_SECRET')
const BRANCH_REF_TAG = 'refs/heads/'

const RELEVANT_PR_ACTIONS = ['opened', 'synchronize']

const retryOn404 = async <T>(fn: () => T) => {
  let attempt = 0

  while (true) {
    attempt += 1

    try {
      return await fn()
    } catch (error) {
      if (
        isAxiosErrorResp(error) &&
        error.response.status === 404 &&
        attempt < 3
      ) {
        console.warn(
          'Github responded with a 404, waiting 2 seconds and retrying [attempt=%d]',
          attempt,
        )
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }

      if (isAxiosErrorResp(error)) {
        console.error(
          'GITHUB API ERROR RESPONSE:\n  attempt: %d\n  url: %s\n  status: %s\n  data: %j',
          attempt,
          error.request.url,
          `${error.response.status} - ${error.response.statusText}`,
          error.response.data,
        )
      }

      throw error
    }
  }
}

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
        const { action, pull_request: pr } = webhook

        if (!RELEVANT_PR_ACTIONS.includes(action)) {
          return {
            body: {
              ignored: true,
              reason: 'irrelevant action',
            },
          }
        }

        const compare = await retryOn404(
          async () => await githubApi.compare(pr.head.sha, pr.base.label),
        )

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
            number: pr.number,
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
