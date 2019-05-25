import { Route } from '@spalger/micro-plus'
import {
  getGithubApi,
  requireDirectApiPassword,
  getRequestLogger,
} from '../lib'
import { ServerResponse } from 'http'
import { runReactors, prReactors } from '../reactors'

export const refreshAllRoute = new Route(
  'GET',
  '/refresh_all',
  requireDirectApiPassword(async ctx => {
    const log = getRequestLogger(ctx)
    const githubApi = getGithubApi(ctx)

    return {
      status: 200,
      async body(response: ServerResponse) {
        response.connection.setNoDelay(true)

        const prs = githubApi.ittrAllOpenPrs()

        while (true) {
          if (!response.connection || response.connection.destroyed) {
            return
          }

          const { value, done } = await prs.next()

          if (value) {
            const result = await runReactors(prReactors, {
              context: {
                action: 'refresh',
                githubApi,
                log,
                pr: value,
              },
            })

            response.write(JSON.stringify(result, null, 2) + '\n\n')
          }

          if (done) {
            response.end()
            break
          }
        }
      },
    }
  }),
)
