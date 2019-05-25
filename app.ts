import apm from 'elastic-apm-node'
import { createMicroHandler, NotFoundError } from '@spalger/micro-plus'

import { Log, assignRootLogger } from './lib'
import { routes } from './routes'
import { IncomingMessage } from 'http'

const startTimes = new WeakMap<IncomingMessage, number>()

export function app(log: Log) {
  return createMicroHandler({
    onRequest(ctx) {
      assignRootLogger(ctx, log)
    },
    routes,
    hooks: {
      onRequest(request) {
        startTimes.set(request, Date.now())
      },
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
      beforeSend(request, response) {
        const endTime = Date.now()
        const reqTime = endTime - startTimes.get(request)!

        log.info(
          `${request.method} ${request.url} - ${
            response.statusCode
          } ${reqTime}ms`,
          {
            '@type': 'request',
            method: request.method,
            url: request.url,
            status: response.statusCode,
            timeMs: reqTime,
          },
        )

        apm.endTransaction(response.statusCode)
      },
    },
  })
}
