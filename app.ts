import * as Crypto from 'crypto'

import {
  createMicroHandler,
  Route,
  getConfigVar,
  UnauthorizedError,
} from '@spalger/micro-plus'
import * as apm from 'elastic-apm-node'

const WEBHOOK_SECRET = getConfigVar('GITHUB_WEBHOOK_SECRET')

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

      return {
        status: 200,
        body: {
          hello: 'world',
        },
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
