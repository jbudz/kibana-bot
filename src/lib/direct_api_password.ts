import {
  getConfigVar,
  RouteHandler,
  UnauthorizedError,
} from '@spalger/micro-plus'

export function requireDirectApiPassword(handler: RouteHandler): RouteHandler {
  return async ctx => {
    const [type = '', base64 = ''] = (ctx.header('authorization') || '')
      .trim()
      .split(' ')

    if (type.toLocaleLowerCase().trim() !== 'basic') {
      throw new UnauthorizedError()
    }

    const [username = '', password = ''] = Buffer.from(base64.trim(), 'base64')
      .toString('utf8')
      .split(':')

    if (
      !username ||
      !password ||
      password !== getConfigVar('DIRECT_API_PASSWORD')
    ) {
      throw new UnauthorizedError()
    }

    return await handler(ctx)
  }
}
