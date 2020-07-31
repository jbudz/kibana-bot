import { requireDirectApiPassword, getSlackApi } from '../lib'
import { Route, BadRequestError } from '../lib'

export const broadcastMsgRoute = new Route({
  method: 'GET',
  path: '/broadcast_msg',
  handler: requireDirectApiPassword(async ctx => {
    const slack = getSlackApi(ctx)

    const msg = ctx.query.message
    if (typeof msg !== 'string' || !msg) {
      throw new BadRequestError('missing `message` query param')
    }

    await slack.broadcast(msg)

    return {
      body: {
        ok: true,
      },
    }
  }),
})
