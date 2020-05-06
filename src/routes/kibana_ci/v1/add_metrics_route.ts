import { Route } from '@spalger/micro-plus'

import { getEsClient, parseBody } from '../../../lib'
import { requireApiKey } from '../../../lib/kibana_ci'

interface Body {
  buildId: string
  metrics: Array<{
    group: string
    id: string
    value: number
  }>
}

export const addMetricsRoute = new Route(
  'POST',
  '/v1/metrics',
  requireApiKey(async ctx => {
    const body = await parseBody<Body>(ctx, fields => ({
      buildId: fields.string('buildId'),
      metrics: fields.arrayOfObjects('metrics', f => ({
        group: f.string('group'),
        id: f.string('id'),
        value: f.number('value'),
      })),
    }))

    if (body.metrics.length) {
      const reqChunks: string[] = []
      for (const metric of body.metrics) {
        reqChunks.push(
          JSON.stringify({
            index: { _index: 'kibana-ci-stats__metrics' },
          }),
          JSON.stringify({
            buildId: body.buildId,
            ...metric,
          }),
        )
      }

      const es = getEsClient(ctx)
      await es.bulk({
        body: reqChunks.join('\n') + '\n',
      })
    }

    return {
      status: 200,
    }
  }),
)
