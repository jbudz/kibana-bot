import apm from 'elastic-apm-node'
import {
  createMicroHandler,
  NotFoundError,
  ReqContext,
} from '@spalger/micro-plus'

import {
  Log,
  assignRootLogger,
  getRequestLogger,
  createRootClient,
  assignEsClient,
} from './lib'
import { routes } from './routes'
import { IncomingMessage } from 'http'

const startTimes = new WeakMap<IncomingMessage, number>()

export function app(log: Log) {
  const es = createRootClient(log)
  const ctxForResponse = new WeakMap<IncomingMessage, ReqContext>()

  return createMicroHandler({
    onRequest(ctx) {
      assignRootLogger(ctx, log)
      assignEsClient(ctx, es)
    },
    routes,
    hooks: {
      onRequest(request) {
        startTimes.set(request, Date.now())
      },
      onRequestParsed(ctx, req) {
        ctxForResponse.set(req, ctx)
        apm.startTransaction(`${ctx.method} ${ctx.pathname}`)
      },
      onResponse() {
        // noop
      },
      onError(error) {
        if (error instanceof NotFoundError) {
          return
        }

        apm.captureError(error)
      },
      beforeSend(request, response) {
        const endTime = Date.now()
        const reqTime = endTime - startTimes.get(request)!
        const ctx = ctxForResponse.get(request)
        const maybeReqLog = ctx ? getRequestLogger(ctx) : log

        maybeReqLog.info(
          `${request.method} ${request.url} - ${response.statusCode} ${reqTime}ms`,
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
