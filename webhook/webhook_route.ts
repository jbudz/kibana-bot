import * as Crypto from 'crypto'
import { Writable, pipeline } from 'stream'
import { promisify } from 'util'

import {
  Route,
  getConfigVar,
  UnauthorizedError,
  ServerError,
} from '@spalger/micro-plus'

import { Repo } from './repo'

const pipelineAsync = promisify(pipeline)
const WEBHOOK_SECRET = getConfigVar('GITHUB_WEBHOOK_SECRET')
const BRANCH_REF_TAG = 'refs/heads/'

const RELEVANT_PR_ACTIONS = ['opened', 'synchronize']

export function makeWebhookRoute(repo: Repo) {
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
        await repo.fetchBranch(branch)
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

        const [, , commonCommit] = await Promise.all([
          repo.fetchPr(number),
          repo.fetchBranch(pr.base.ref),
          repo.getMergeBase(pr.head.sha, `FETCH_HEAD`),
        ])

        return {
          body: {
            number: pr.number,
            state: pr.state,
            commonCommit,
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
