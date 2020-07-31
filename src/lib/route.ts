import { ReqContext } from './req_context'

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'
export const VALID_METHODS: Method[] = ['GET', 'POST', 'PUT', 'DELETE']

export interface Response {
  status?: number
  body?: string | Record<string, unknown>
  headers?: Record<string, string>
}

interface RouteOptions {
  method: Method
  path: string
  handler: Handler
}

export type Handler = (
  ctx: ReqContext,
) => Response | void | Promise<Response | void>

export class Route {
  constructor(private options: RouteOptions) {}

  match(ctx: ReqContext) {
    return this.options.method === ctx.method && this.options.path === ctx.path
  }

  async handle(ctx: ReqContext) {
    return await this.options.handler(ctx)
  }
}
