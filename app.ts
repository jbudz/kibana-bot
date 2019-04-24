import { createMicroHandler, Route } from '@spalger/micro-plus'
import * as apm from 'elastic-apm-node'

import { webhookRoute } from './webhook'

module.exports = createMicroHandler({
  routes: [
    new Route('GET', '/', async () => ({
      status: 200,
      body: {
        hello: 'world',
      },
    })),
    webhookRoute,
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
