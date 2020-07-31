import { Handler } from './route'
import { UnauthorizedError } from './error_response'

export function requireDirectApiPassword(handler: Handler): Handler {
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
      password !== ctx.server.config.directApiPassword
    ) {
      throw new UnauthorizedError()
    }

    return await handler(ctx)
  }
}
