import { Route, BadRequestError } from '@spalger/micro-plus'

import { getEsClient } from '../../lib'
import { requireApiKey } from '../../lib/kibana_ci'

export const buildCompleteRoute = new Route(
  'POST',
  '/ci/build/_complete',
  requireApiKey(async ctx => {
    const buildId = ctx.query.buildId
    if (typeof buildId !== 'string') {
      throw new BadRequestError('missing `buildId` query param')
    }

    const es = getEsClient(ctx)
    await es.update(
      {
        index: 'kibana-ci-stats__builds',
        id: buildId,
        body: {
          script: {
            lang: 'painless',
            source: `
            if (ctx._source.completedAt == null) {
              ctx._source.completedAt = params.date
            }
          `,
            params: {
              date: new Date(),
            },
          },
        },
      },
      {
        ignore: [404],
      },
    )

    return {
      status: 200,
    }
  }),
)
