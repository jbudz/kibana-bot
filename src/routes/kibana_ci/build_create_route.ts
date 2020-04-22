import { Route, BadRequestError } from '@spalger/micro-plus'

import { getRequestLogger, getEsClient, parseBody } from '../../lib'
import { requireApiKey } from '../../lib/kibana_ci'

interface Body {
  jenkinsJobName: string
  jenkinsJobId: string
  branch: string
  commitSha: string
}

export const buildCreateRoute = new Route(
  'PUT',
  '/ci/build',
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
      }
    })

    log.info('build received', body)

    const resp = await es.index({
      index: 'kibana-ci-stats__builds',
      body: {
        ...body,
        startedAt: new Date(),
      },
    })

    const id = resp.body._id
    log.info('id of build:', id)

    return {
      status: 201,
      body: { id },
    }
  }),
)
