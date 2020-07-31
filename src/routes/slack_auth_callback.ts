import { getSlackApi, Route, BadRequestError } from '../lib'

export const slackAuthCallbackRoute = new Route({
  method: 'GET',
  path: '/slack_auth_callback',
  handler: async ctx => {
    const slack = getSlackApi(ctx)
    const code = ctx.query['code']

    if (!code || typeof code !== 'string') {
      throw new BadRequestError('expected a single ?code= param')
    }

    const resp = await slack.finishOauth(code)

    return {
      body: resp,
    }
  },
})
