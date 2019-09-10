import { Route } from '@spalger/micro-plus'
import {
  getGithubApi,
  requireDirectApiPassword,
  getIsChangeIncludingDocs,
} from '../lib'
import { ServerResponse } from 'http'

const ES_DOCS_CONTEXT = 'elasticsearch-ci/docs'

export const ensureCiRoute = new Route(
  'GET',
  '/clear_failed_docs_build',
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

          if (getState(ES_DOCS_CONTEXT) !== 'failure') {
            response.write(`#${pr.number} no failure\n`)
            continue
          }

          const files = await githubApi.getPrFiles(pr.number)
          const isChangeIncludingDocs = getIsChangeIncludingDocs(files)
          if (isChangeIncludingDocs) {
            response.write(`#${pr.number} includes doc changes\n`)
            continue
          }

          await githubApi.setCommitStatus(pr.head.sha, {
            context: ES_DOCS_CONTEXT,
            description: 'No docs changes in this PR, so force success',
            state: 'success',
          })
          response.write(`#${pr.number} cleared failure\n`)
        }

        response.end()
      },
    }
  }),
)
