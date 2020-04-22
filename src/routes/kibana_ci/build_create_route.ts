import { Route, BadRequestError } from '@spalger/micro-plus'

import { getRequestLogger, getEsClient, parseBody } from '../../lib'
import { requireApiKey } from '../../lib/kibana_ci'

interface Body {
  jenkinsJobName: string
  jenkinsJobId: string
  branch: string
  commitSha: string
  startedAt: string
}

export const buildCreateRoute = new Route(
  'PUT',
  '/ci/build',
  requireApiKey(async ctx => {
    const log = getRequestLogger(ctx)
    const es = getEsClient(ctx)

    const body = await parseBody<Body>(ctx, input => {
      const jenkinsJobName = input.jenkinsJobName
      if (typeof jenkinsJobName !== 'string' || jenkinsJobName.length === 0) {
        throw new BadRequestError(
          '`jenkinsJobName` property must be a non-empty string',
        )
      }

      const jenkinsJobId = input.jenkinsJobId
      if (typeof jenkinsJobId !== 'string' || jenkinsJobId.length === 0) {
        throw new BadRequestError(
          '`jenkinsJobId` property must be a non-empty string',
        )
      }

      const branch = input.branch
      if (typeof branch !== 'string' || branch.length === 0) {
        throw new BadRequestError(
          '`branch` property must be a non-empty string',
        )
      }

      const commitSha = input.commitSha
      if (typeof commitSha !== 'string' || commitSha.length === 0) {
        throw new BadRequestError(
          '`commitSha` property must be a non-empty string',
        )
      }

      const startedAt = input.startedAt
      if (typeof startedAt !== 'string' || startedAt.length === 0) {
        throw new BadRequestError(
          `\`startedAt\` property must be a non-empty string in simple IS0-8601 format (ie ${new Date().toJSON()})`,
        )
      }

      return {
        jenkinsJobName,
        jenkinsJobId,
        startedAt,
        branch,
        commitSha,
      }
    })

    log.info('build received', body)

    const resp = await es.index({
      index: 'kibana-ci-stats__builds',
      body,
    })

    const id = resp.body._id
    log.info('id of build:', id)

    return {
      status: 201,
      body: { id },
    }
  }),
)
