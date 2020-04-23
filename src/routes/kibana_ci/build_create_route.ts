import { Route, BadRequestError } from '@spalger/micro-plus'
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
  prSourceBranch?: string
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
      const jenkinsJobName = fields.use('jenkinsJobName')
      if (typeof jenkinsJobName !== 'string' || jenkinsJobName.length === 0) {
        throw new BadRequestError(
          '`jenkinsJobName` property must be a non-empty string',
        )
      }

      const jenkinsJobId = fields.use('jenkinsJobId')
      if (typeof jenkinsJobId !== 'string' || jenkinsJobId.length === 0) {
        throw new BadRequestError(
          '`jenkinsJobId` property must be a non-empty string',
        )
      }

      const branch = fields.use('branch')
      if (typeof branch !== 'string' || branch.length === 0) {
        throw new BadRequestError(
          '`branch` property must be a non-empty string',
        )
      }

      const commitSha = fields.use('commitSha')
      if (typeof commitSha !== 'string' || commitSha.length === 0) {
        throw new BadRequestError(
          '`commitSha` property must be a non-empty string',
        )
      }

      const prId = fields.use('prId')
      if (
        prId !== undefined &&
        (typeof prId !== 'string' || prId.length === 0)
      ) {
        throw new BadRequestError(
          '`prId` property must be a non-empty string when it is defined',
        )
      }

      const prTargetBranch = fields.use('prTargetBranch')
      if (
        prTargetBranch !== undefined &&
        (typeof prTargetBranch !== 'string' || prTargetBranch.length === 0)
      ) {
        throw new BadRequestError(
          '`prTargetBranch` property must be a non-empty string when it is defined',
        )
      }

      const prSourceBranch = fields.use('prSourceBranch')
      if (
        prSourceBranch !== undefined &&
        (typeof prSourceBranch !== 'string' || prSourceBranch.length === 0)
      ) {
        throw new BadRequestError(
          '`prSourceBranch` property must be a non-empty string when it is defined',
        )
      }

      const extras = fields.extraKeys()
      if (extras?.length) {
        throw new BadRequestError(
          `unexpected fields in body: ${extras.join(', ')}`,
        )
      }

      return {
        jenkinsJobName,
        jenkinsJobId,
        branch,
        commitSha,
        prId,
        prTargetBranch,
        prSourceBranch,
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

    if (!allOrNothing(body.prId, body.prTargetBranch, body.prSourceBranch)) {
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
