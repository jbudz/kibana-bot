import { Route, BadRequestError } from '@spalger/micro-plus'

import { getEsClient, parseBody } from '../../lib'
import { requireApiKey } from '../../lib/kibana_ci'

interface Body {
  branch: string
  commit: string
}

export const addGitInfoRoute = new Route(
  'POST',
  '/git_info',
  requireApiKey(async ctx => {
    const buildId = ctx.query.buildId
    if (typeof buildId !== 'string') {
      throw new BadRequestError('missing `buildId` query param')
    }

    const body = await parseBody<Body>(ctx, fields => {
      return {
        branch: fields.string('branch'),
        commit: fields.string('commit'),
      }
    })

    const es = getEsClient(ctx)
    await es.update({
      index: 'kibana-ci-stats__builds',
      id: buildId,
      body: {
        script: {
          lang: 'painless',
          source: `
            if (ctx._source.branch == null) {
              ctx._source.branch = params.branch
            }
            if (ctx._source.commit == null) {
              ctx._source.commit = params.commit
            }
          `,
          params: {
            branch: body.branch,
            commit: body.commit,
          },
        },
      },
    })

    return {
      status: 200,
    }
  }),
)
