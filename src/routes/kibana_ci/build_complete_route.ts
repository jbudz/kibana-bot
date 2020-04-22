import { Route, BadRequestError, NotFoundError } from '@spalger/micro-plus'
import { errors } from '@elastic/elasticsearch'

import { getEsClient } from '../../lib'
import { requireApiKey } from '../../lib/kibana_ci'

export const buildCompleteRoute = new Route(
  'POST',
  '/build/_complete',
  requireApiKey(async ctx => {
    const buildId = ctx.query.buildId
    if (typeof buildId !== 'string') {
      throw new BadRequestError('missing `buildId` query param')
    }

    const es = getEsClient(ctx)
    try {
      await es.update({
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
      })
    } catch (error) {
      if (error instanceof errors.ResponseError && error.statusCode === 404) {
        throw new NotFoundError('unknown build')
      }

      throw error
    }

    return {
      status: 200,
    }
  }),
)
