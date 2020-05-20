import { requireDirectApiPassword, getGithubApi, getEsClient } from '../lib'
import { Route } from '@spalger/micro-plus'
import { prReactors, runReactors } from '../reactors'
import { getRequestLogger, InvalidLabelLog } from '../lib'

const LABEL_REACTORS = ['releaseNoteLabels', 'releaseVersionLabels']

export const fixupInvalidLabelsRoute = new Route(
  'GET',
  '/fixup_invalid_labels',
  requireDirectApiPassword(async ctx => {
    const es = getEsClient(ctx)
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
              input: {
                action: 'refresh',
                pr,
                prFromApi: true,
              },
              githubApi,
              log,
              es,
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
)
