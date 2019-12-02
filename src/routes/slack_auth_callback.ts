// import { getEsClient } from '../lib'
import { getSlackApi } from '../lib'
import { Route, SearchParamError } from '@spalger/micro-plus'

export const slackAuthCallbackRoute = new Route(
  'GET',
  '/slack_auth_callback',
  async ctx => {
    // const es = getEsClient(ctx)
    const slack = getSlackApi(ctx)
    const code = ctx.query['code']

    if (!code || typeof code !== 'string') {
      throw new SearchParamError('code', 'expected a single ?code= param')
    }

    const resp = await slack.finishOauth(code)

    return {
      body: {
        slack_resp: {
          data: resp.data,
          headers: resp.headers,
          status: resp.status,
        },
      },
    }
  },
)
