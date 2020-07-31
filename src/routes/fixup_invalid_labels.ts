import { requireDirectApiPassword, getGithubApi } from '../lib'

import { prReactors, runReactors } from '../reactors'
import { getRequestLogger, InvalidLabelLog, Route } from '../lib'

const LABEL_REACTORS = ['releaseNoteLabels', 'releaseVersionLabels']

export const fixupInvalidLabelsRoute = new Route({
  method: 'GET',
  path: '/fixup_invalid_labels',
  handler: requireDirectApiPassword(async ctx => {
    const { config, es } = ctx.server
    const log = getRequestLogger(ctx)
    const githubApi = getGithubApi(ctx)

    const results: any[] = []

    await new InvalidLabelLog(es, log).handleEach(async prId => {
      const pr = await githubApi.getPr(prId)
      results.push(
        await runReactors(
          prReactors.filter(r => LABEL_REACTORS.includes(r.id)),
          {
            context: {
              config,
              es,
              log,
              githubApi,
            },
            input: {
              action: 'refresh',
              pr,
              prFromApi: true,
            },
          },
        ),
      )
    })

    return {
      body: {
        results,
      },
    }
  }),
})
