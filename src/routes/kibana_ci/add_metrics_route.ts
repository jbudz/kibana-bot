import { Route, BadRequestError } from '@spalger/micro-plus'

import { getEsClient, parseBody } from '../../lib'
import { requireApiKey } from '../../lib/kibana_ci'

interface Body {
  metrics: Array<{
    name: string
    subName: string
    value: number
  }>
}

export const addMetricsRoute = new Route(
  'POST',
  '/metrics',
  requireApiKey(async ctx => {
    const buildId = ctx.query.buildId
    if (typeof buildId !== 'string') {
      throw new BadRequestError('missing `buildId` query param')
    }

    const body = await parseBody<Body>(ctx, fields => ({
      metrics: fields.arrayOfObjects('metrics', f => ({
        name: f.string('name'),
        subName: f.string('subName'),
        value: f.number('value'),
      })),
    }))

    const reqChunks: string[] = []
    for (const metric of body.metrics) {
      reqChunks.push(
        JSON.stringify({
          index: { _index: 'kibana-ci-stats__metrics' },
        }),
        JSON.stringify({
          ...metric,
          buildId,
        }),
      )
    }

    const es = getEsClient(ctx)
    await es.bulk({
      body: reqChunks.join('\n'),
    })

    return {
      status: 200,
    }
  }),
)
