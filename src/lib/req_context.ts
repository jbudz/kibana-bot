import { Readable } from 'stream'
import { ParsedUrlQuery } from 'querystring'
import { IncomingHttpHeaders, IncomingMessage } from 'http'
import Url from 'url'

import { BadRequestError, NotFoundError } from './error_response'
import { Server } from './server'
import { Method, VALID_METHODS } from './route'
import { has, includes } from './utils'

export class ReqContext {
  static parse(server: Server, req: IncomingMessage) {
    if (!req.method) {
      throw new BadRequestError('missing method')
    }

    if (!includes(VALID_METHODS, req.method)) {
      throw new NotFoundError()
    }

    if (!req.url) {
      throw new BadRequestError('missing url')
    }

    const url = Url.parse(req.url, true)
    if (!url.pathname) {
      throw new NotFoundError()
    }

    return new ReqContext(
      server,
      req.method,
      url.pathname,
      url.query,
      req.headers,
      req,
    )
  }

  constructor(
    public readonly server: Server,
    public readonly method: Method,
    public readonly path: string,
    public readonly query: ParsedUrlQuery,
    private readonly headers: IncomingHttpHeaders,
    private body: Readable | null | undefined,
  ) {}

  header(name: string) {
    if (!has(this.headers, name)) {
      return
    }

    const value = this.headers[name]
    if (Array.isArray(value)) {
      return value[0]
    }

    return value
  }

  readBodyAsStream() {
    if (this.body === undefined) {
      throw new Error('request does not have a body')
    }

    if (this.body === null) {
      throw new Error('request body was already consumed')
    }

    const stream = this.body
    this.body = null
    return stream
  }
}
