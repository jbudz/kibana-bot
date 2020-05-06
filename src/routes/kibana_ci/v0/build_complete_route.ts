import { Route, BadRequestError, NotFoundError } from '@spalger/micro-plus'
import { errors } from '@elastic/elasticsearch'

import { getEsClient, parseBody } from '../../../lib'
import { requireApiKey } from '../../../lib/kibana_ci'

interface Body {
  result: string
}

export const buildCompleteRoute = new Route(
  'POST',
  '/build/_complete',
  requireApiKey(async ctx => {
    const id = ctx.query.id
    if (typeof id !== 'string') {
      throw new BadRequestError('missing `id` query param')
    }

    const body = await parseBody<Body>(ctx, fields => {
      return {
        result: fields.string('result'),
      }
    })

    const es = getEsClient(ctx)
    try {
      await es.update({
        index: 'kibana-ci-stats__builds',
        id,
        body: {
          script: {
            lang: 'painless',
            source: `
              if (ctx._source.completedAt == null) {
                ctx._source.completedAt = params.date
              }

              if (ctx._source.result == null) {
                ctx._source.result = params.result
              }
            `,
            params: {
              date: new Date(),
              result: body.result,
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
