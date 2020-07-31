import { IncomingMessage, createServer, ServerResponse } from 'http'
import Querystring from 'querystring'

import apm from 'elastic-apm-node'

import { ReqContext } from './req_context'
import { ErrorResponse, NotFoundError } from './error_response'
import { Config } from './config'
import { Route, Response } from './route'
import { EsClient, setupEsClientLogging } from './es'
import { ServerLog, getRequestLogger } from './log'
import { getRequestId } from './request_id'

export class Server {
  public readonly es: EsClient
  public readonly log: ServerLog

  constructor(public readonly config: Config, public readonly routes: Route[]) {
    this.es = new EsClient({
      node: config.get('esUrl'),
    })

    this.log = new ServerLog(
      process.env.NODE_ENV === 'production' ? this.es : undefined,
    )

    setupEsClientLogging(this.es, this.log)
  }

  start() {
    const http = createServer((req, res) => {
      this.handleRequest(req, res).catch(error => {
        // last resort, handle request should catch and handle all errors
        apm.captureError(error)
        this.log.error({
          type: 'FATAL ERROR',
          message: 'server.handleRequest() rejected',
        })
        res.statusCode = 500
        res.end({ error: 'fatal error' })
      })
    })

    const port = this.config.get('port')
    http.listen(port, () => {
      this.log.info({
        type: 'listening',
        message: `server listening at http://localhost:${port}`,
      })
    })
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse) {
    const startTime = Date.now()
    const ctx = ReqContext.parse(this, req)

    try {
      apm.startTransaction(`${ctx.method} ${ctx.path}`)

      const route = this.routes.find(route => route.match(ctx))
      if (!route) {
        throw new NotFoundError()
      }

      this.handleResponse(ctx, res, startTime, (await route.handle(ctx)) || {})
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        apm.captureError(error)
      }

      this.handleResponse(ctx, res, startTime, ErrorResponse.fromThrown(error))
    }
  }

  private handleResponse(
    ctx: ReqContext,
    res: ServerResponse,
    startTime: number,
    response: Response,
  ) {
    const reqTime = Date.now() - startTime
    const reqLog = getRequestLogger(ctx)
    res.statusCode = res.statusCode || 200

    res.setHeader('request-id', getRequestId(ctx))
    if (response.headers) {
      for (const [key, value] of Object.entries(response.headers)) {
        res.setHeader(key, value)
      }
    }

    const body =
      typeof response.body === 'string'
        ? response.body
        : JSON.stringify(response.body)

    res.setHeader('content-length', body.length)
    res.end(body)

    reqLog.info({
      type: 'request',
      message: `${ctx.method} ${ctx.path} - ${res.statusCode} ${reqTime}ms`,
      meta: {
        method: ctx.method,
        path: ctx.path,
        query: Querystring.stringify(ctx.query),
        status: res.statusCode,
        timeMs: reqTime,
      },
      extra:
        response instanceof ErrorResponse ? response.internalData : undefined,
    })

    apm.endTransaction(res.statusCode)
  }
}
