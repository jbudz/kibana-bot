import { ReqContext } from '@spalger/micro-plus'
import { getRequestLogger } from '../log'

export function logV0Usage(ctx: ReqContext) {
  const log = getRequestLogger(ctx)

  log.info('v0 of the ci-stats api was used', {
    '@type': 'v0 ci-stats usage',
    path: ctx.pathname,
  })
}
