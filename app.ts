import { ServerResponse } from 'http'

import {
  createMicroHandler,
  Route,
  NotFoundError,
  getConfigVar,
} from '@spalger/micro-plus'
import apm from 'elastic-apm-node'

import { makeWebhookRoute, GithubApi, checkPr } from './webhook'

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
      new Route('GET', '/refresh', async () => {
        return {
          status: 200,
          async body(response: ServerResponse) {
            try {
              response.connection.setNoDelay(true)
              const prs = githubApi.ittrAllOpenPrs()

              while (true) {
                if (!response.connection || response.connection.destroyed) {
                  return
                }

                const { value, done } = await prs.next()

                if (value) {
                  const json = JSON.stringify(
                    await checkPr(githubApi, value),
                    null,
                    2,
                  )

                  response.write(`\n\nPR #${value.number}\n${json}`)
                }

                if (done) {
                  response.end()
                  break
                }
              }
            } catch (error) {
              response.end(
                `\n\nERROR: ${error.stack || error.message || error}`,
              )
            }
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
