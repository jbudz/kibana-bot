import {
  getConfigVar,
  RouteHandler,
  UnauthorizedError,
} from '@spalger/micro-plus'

const PASSWORD = getConfigVar('DIRECT_API_PASSWORD')

export function requireDirectApiPassword(handler: RouteHandler): RouteHandler {
  return async (ctx) => {
    const [type = '', base64 = ''] = (ctx.header('authorization') || '')
      .trim()
      .split(' ')

    if (type.toLocaleLowerCase().trim() !== 'basic') {
      throw new UnauthorizedError()
    }

    const [username = '', password = ''] = Buffer.from(base64.trim(), 'base64')
      .toString('utf8')
      .split(':')

    if (!username || !password || password !== PASSWORD) {
      throw new UnauthorizedError()
    }

    return await handler(ctx)
  }
}
