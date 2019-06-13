import { Route, BadRequestError } from '@spalger/micro-plus'
import {
  getGithubApi,
  requireDirectApiPassword,
  getRequestLogger,
  getEsClient,
} from '../lib'
import { ServerResponse } from 'http'
import { runReactors, prReactors } from '../reactors'

export const refreshAllRoute = new Route(
  'GET',
  '/refresh_all',
  requireDirectApiPassword(async ctx => {
    const log = getRequestLogger(ctx)
    const es = getEsClient(ctx)
    const githubApi = getGithubApi(ctx)

    const reactors = prReactors.filter(reactor =>
      ctx.query.reactor ? reactor.id === ctx.query.reactor : true,
    )

    if (!reactors) {
      throw new BadRequestError('?reactor does not match any known reactors')
    }

    return {
      status: 200,
      async body(response: ServerResponse) {
        response.connection.setNoDelay(true)

        for await (const pr of githubApi.ittrAllOpenPrs()) {
          if (!response.connection || response.connection.destroyed) {
            return
          }

          const result = await runReactors(reactors, {
            context: {
              githubApi,
              log,
              es,
              input: {
                action: 'refresh',
                pr,
              },
            },
          })

          response.write(JSON.stringify(result, null, 2) + '\n\n')
        }

        response.end()
      },
    }
  }),
)
