import { createMicroHandler, Route, getConfigVar } from '@spalger/micro-plus'
import apm from 'elastic-apm-node'

import { makeWebhookRoute, Repo } from './webhook'

export const repo = new Repo(getConfigVar('CLONE_DIR'))

export const microHandler = createMicroHandler({
  async onRequest() {
    await repo.init()
  },
  routes: [
    new Route('GET', '/', async () => ({
      status: 200,
      body: {
        hello: 'world',
      },
    })),
    makeWebhookRoute(repo),
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
