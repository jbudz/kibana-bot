import { UnauthorizedError, ReqContext } from '@spalger/micro-plus'

export function validateBasicAuth(ctx: ReqContext, username: string, password: string) {
  const auth = ctx.header('Authorization');
  if (typeof auth !== 'string') {
    throw new UnauthorizedError();
  }

  const [type, creds] = auth.split(' ');
  if (type.trim().toLocaleLowerCase() !== 'basic') {
    throw new UnauthorizedError('expected basic auth');
  }

  const supplied = Buffer.from(creds, 'base64').toString('utf8').split(':');
  if (supplied[0] !== username) {
    throw new UnauthorizedError('invalid username');
  }
  if (supplied.slice(1).join(':') !== password) {
    throw new UnauthorizedError('invalid password');
  }
}