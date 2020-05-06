import { Route } from '@spalger/micro-plus'
import * as Uuid from 'uuid'

import { getRequestLogger, getEsClient, parseBody } from '../../../lib'
import { requireApiKey, logV0Usage } from '../../../lib/kibana_ci'

interface Body {
  jenkinsJobName: string
  jenkinsJobId: string
  prId?: string
}

export const buildCreateRoute = new Route(
  'POST',
  '/build',
  requireApiKey(async ctx => {
    logV0Usage(ctx)

    const log = getRequestLogger(ctx)
    const es = getEsClient(ctx)

    const body = await parseBody<Body>(ctx, fields => {
      return {
        jenkinsJobName: fields.string('jenkinsJobName'),
        jenkinsJobId: fields.string('jenkinsJobId'),
        prId: fields.optionalString('prId'),
      }
    })

    const id = Uuid.v4()
    log.info('creating build', {
      '@type': 'creating build',
      extra: {
        id,
        body,
      },
    })

    try {
      await es.create({
        index: 'kibana-ci-stats__builds',
        id,
        body: {
          ...body,
          startedAt: new Date(),
        },
      })
    } catch (error) {
      throw new Error('unable to create the build, try again later')
    }

    return {
      status: 201,
      body: { id },
    }
  }),
)
