import * as Crypto from 'crypto'

import {
  createMicroHandler,
  Route,
  getConfigVar,
  UnauthorizedError,
  ServerError,
} from '@spalger/micro-plus'
import * as apm from 'elastic-apm-node'

const WEBHOOK_SECRET = getConfigVar('GITHUB_WEBHOOK_SECRET')
const BRANCH_REF_TAG = 'refs/heads/'

const getHmac = (string: string) =>
  Crypto.createHmac('sha1', WEBHOOK_SECRET)
    .update(string)
    .digest('hex')

module.exports = createMicroHandler({
  routes: [
    new Route('GET', '/', async () => ({
      status: 200,
      body: {
        hello: 'world',
      },
    })),

    new Route('POST', '/webhook', async ctx => {
      const body = await ctx.readBodyAsText()

      const signature = ctx.header('X-Hub-Signature')
      const expectedSignature = `sha1=${getHmac(body)}`
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
          const { pull_request: pr } = webhook
          return {
            body: {
              number: pr.number,
              state: pr.state,
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
    }),
  ],
  apmAgent: {
    onRequest() {},
    onRequestParsed(ctx) {
      apm.startTransaction(`${ctx.method} ${ctx.pathname}`)
    },
    onResponse() {},
    onError(error) {
      apm.captureError(error)
    },
    beforeSend(_, response) {
      apm.endTransaction(response.statusCode)
    },
  },
})
