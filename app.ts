import { createMicroHandler, Route } from '@spalger/micro-plus'
import * as apm from 'elastic-apm-node'

module.exports = createMicroHandler({
  routes: [
    new Route('GET', '/', async () => ({
      status: 200,
      body: {
        hello: 'world',
      }
    }))
  ],
  apmAgent: {
    onRequest(request, response) {
    },
    onRequestParsed(ctx, req, resp) {
      apm.startTransaction(`${ctx.method} ${ctx.pathname}`)
    },
    onResponse(resp, ctx, req, response) {
    },
    onError(error, ctx, request, response) {
      apm.captureError(error)
    },
    beforeSend(req, response) {
      apm.endTransaction(response.statusCode)
    }
  }
})