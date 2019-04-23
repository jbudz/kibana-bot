import { createMicroHandler, Route } from '@spalger/micro-plus'
import * as apm from 'elastic-apm-node'

module.exports = createMicroHandler({
  routes: [
    new Route('GET', '/', async () => ({
      status: 200,
      body: {
        hello: 'world',
      },
    })),
    new Route('POST', '/webhook', async ctx => {
      const body = await ctx.readBodyAsJson()
      console.log('webhook body', body)

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
