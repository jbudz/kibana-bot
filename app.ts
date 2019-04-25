import {
  createMicroHandler,
  Route,
  NotFoundError,
  getConfigVar,
} from '@spalger/micro-plus'
import apm from 'elastic-apm-node'

import { makeWebhookRoute, GithubApi } from './webhook'

export function app() {
  const githubApi = new GithubApi(getConfigVar('GITHUB_SECRET'))

  return createMicroHandler({
    routes: [
      new Route('GET', '/', async () => ({
        status: 200,
        body: {
          hello: 'world',
        },
      })),
      makeWebhookRoute(githubApi),
    ],
    apmAgent: {
      onRequest() {},
      onRequestParsed(ctx) {
        apm.startTransaction(`${ctx.method} ${ctx.pathname}`)
      },
      onResponse() {},
      onError(error) {
        if (error instanceof NotFoundError) {
          return
        }

        apm.captureError(error)
      },
      beforeSend(_, response) {
        apm.endTransaction(response.statusCode)
      },
    },
  })
}
