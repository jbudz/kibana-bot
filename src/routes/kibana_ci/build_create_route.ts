import { Route } from '@spalger/micro-plus'
import * as Uuid from 'uuid'

import { getRequestLogger, getEsClient, parseBody } from '../../lib'
import { requireApiKey } from '../../lib/kibana_ci'

interface Body {
  jenkinsJobName: string
  jenkinsJobId: string
  branch: string
  commitSha: string
  prId?: string
  prTargetBranch?: string
}

const allOrNothing = (...args: Array<any>) => {
  const allUndefined = args.every(arg => arg === undefined)
  const noneUndefined = args.every(arg => arg !== undefined)
  return allUndefined || noneUndefined
}

export const buildCreateRoute = new Route(
  'POST',
  '/build',
  requireApiKey(async ctx => {
    const log = getRequestLogger(ctx)
    const es = getEsClient(ctx)

    const body = await parseBody<Body>(ctx, fields => {
      return {
        jenkinsJobName: fields.string('jenkinsJobName'),
        jenkinsJobId: fields.string('jenkinsJobId'),
        branch: fields.string('branch'),
        commitSha: fields.string('commitSha'),
        prId: fields.optionalString('prId'),
        prTargetBranch: fields.optionalString('prTargetBranch'),
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

    if (!allOrNothing(body.prId, body.prTargetBranch)) {
      log.info('incomplete pr details sent with build', {
        '@type': 'incomplete pr details',
      })
    }

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
