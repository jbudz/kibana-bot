import { Route } from '@spalger/micro-plus'
import { getGithubApi, requireDirectApiPassword } from '../lib'
import { ServerResponse } from 'http'

const OUR_CONTEXT = 'prbot:missing-ci'
const CI_CONTEXT = 'kibana-ci'
const SKIP_CI_RE = /\[skip\W+ci\]/
const MISSING_DESCRIPTION = 'please hold, CI is a little messed up right now'

export const ensureCiRoute = new Route(
  'GET',
  '/ensure_ci',
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

          if (Date.now() - new Date(pr.created_at).getTime() < 60 * 1000) {
            // ignore prs that were created in the last 60 seconds
            continue
          }

          const status = await githubApi.getCommitStatus(pr.head.sha)
          const getState = (context: string) => {
            const s = status.statuses.find(s => s.context === context)
            return s ? s.state : undefined
          }
          const getDescription = (context: string) => {
            const s = status.statuses.find(s => s.context === context)
            return s ? s.description : undefined
          }

          if (
            getState(CI_CONTEXT) === undefined &&
            !(pr.body.match(SKIP_CI_RE) || pr.title.match(SKIP_CI_RE))
          ) {
            if (
              getState(OUR_CONTEXT) !== 'failure' ||
              getDescription(OUR_CONTEXT) !== MISSING_DESCRIPTION
            ) {
              await githubApi.setCommitStatus(pr.head.sha, {
                context: OUR_CONTEXT,
                description: MISSING_DESCRIPTION,
                state: 'failure',
              })
              response.write(`#${pr.number} ci missing\n`)
            } else {
              response.write(`#${pr.number} noop\n`)
            }
          } else if (getState(OUR_CONTEXT) === 'failure') {
            await githubApi.setCommitStatus(pr.head.sha, {
              context: OUR_CONTEXT,
              state: 'success',
            })
            response.write(`#${pr.number} cleared failure\n`)
          } else {
            response.write(`#${pr.number} has ci\n`)
          }
        }

        response.end()
      },
    }
  }),
)
