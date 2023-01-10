import { requireDirectApiPassword, getSlackApi } from '../lib'
import { Route, SearchParamError } from '@spalger/micro-plus'

export const broadcastMsgRoute = new Route(
  'GET',
  '/broadcast_msg',
  requireDirectApiPassword(async (ctx) => {
    const slack = getSlackApi(ctx)

    const msg = ctx.query.message
    if (typeof msg !== 'string' || !msg) {
      throw new SearchParamError('message', 'required')
    }

    await slack.broadcast(msg)

    return {
      body: {
        ok: true,
      },
    }
  }),
)
