import {
  RouteHandler,
  getConfigVar,
  BadRequestError,
} from '@spalger/micro-plus'

const KIBANA_CI_API_KEY = getConfigVar('KIBANA_CI_API_KEY')

const EXPECTED_AUTHORIZATION = `token ${KIBANA_CI_API_KEY}`

export function requireApiKey(handler: RouteHandler): RouteHandler {
  return ctx => {
    if (!ctx.headers['authorization']) {
      throw new BadRequestError('missing authorization header')
    }

    if (ctx.headers['authorization'] !== EXPECTED_AUTHORIZATION) {
      throw new BadRequestError('invalid authorization')
    }

    return handler(ctx)
  }
}
