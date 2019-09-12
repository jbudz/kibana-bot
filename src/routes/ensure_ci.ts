import { Route } from '@spalger/micro-plus'
import { getGithubApi, requireDirectApiPassword } from '../lib'
import { ServerResponse } from 'http'

const ES_DOCS_CONTEXT = 'elasticsearch-ci/docs'

export const ensureCiRoute = new Route(
  'GET',
  '/clear_pending_docs_build',
  requireDirectApiPassword(async ctx => {
    const githubApi = getGithubApi(ctx)

    return {
      status: 200,
      async body(response: ServerResponse) {
        response.connection.setNoDelay(true)

        for await (const pr of githubApi.ittrAllOpenPrs()) {
          if (!response.connection || response.connection.destroyed) {
            return
          }

          const status = await githubApi.getCommitStatus(pr.head.sha)
          const getState = (context: string) => {
            const s = status.statuses.find(s => s.context === context)
            return s ? s.state : undefined
          }

          switch (getState(ES_DOCS_CONTEXT)) {
            case 'pending':
            case 'failure':
              await githubApi.setCommitStatus(pr.head.sha, {
                context: ES_DOCS_CONTEXT,
                description: 'This job has been disabled for now',
                state: 'success',
              })
              response.write(`#${pr.number} cleared\n`)
              continue
            case 'success':
              response.write(`#${pr.number} already green\n`)
              continue
            default:
              response.write(`#${pr.number} no status\n`)
          }
        }

        response.end()
      },
    }
  }),
)
