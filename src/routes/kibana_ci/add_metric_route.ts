import { Route, BadRequestError } from '@spalger/micro-plus'

import { getEsClient, parseBody } from '../../lib'
import { requireApiKey } from '../../lib/kibana_ci'

interface Body {
  name: string
  subName: string
  value: number
}

export const addMetricRoute = new Route(
  'POST',
  '/metric',
  requireApiKey(async ctx => {
    const buildId = ctx.query.buildId
    if (typeof buildId !== 'string') {
      throw new BadRequestError('missing `buildId` query param')
    }

    const body = await parseBody<Body>(ctx, fields => {
      return {
        name: fields.string('name'),
        subName: fields.string('subName'),
        value: fields.number('value'),
      }
    })

    const es = getEsClient(ctx)
    await es.index({
      index: 'kibana-ci-stats__metrics',
      body: {
        ...body,
        buildId,
      },
    })

    return {
      status: 200,
    }
  }),
)
