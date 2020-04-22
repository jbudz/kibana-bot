import { Route, BadRequestError } from '@spalger/micro-plus'
import * as Uuid from 'uuid'
import Es from '@elastic/elasticsearch'

import { getRequestLogger, getEsClient, parseBody } from '../../lib'
import { requireApiKey } from '../../lib/kibana_ci'

interface Body {
  id?: string
  jenkinsJobName: string
  jenkinsJobId: string
  branch: string
  commitSha: string
}

export const buildCreateRoute = new Route(
  'PUT',
  '/build',
  requireApiKey(async ctx => {
    const log = getRequestLogger(ctx)
    const es = getEsClient(ctx)

    const body = await parseBody<Body>(ctx, fields => {
      const id = fields.use('id')
      if (id !== undefined) {
        if (typeof id !== 'string') {
          throw new BadRequestError('`id` must be a string when defined')
        }
        if (id.length !== 36) {
          throw new BadRequestError('`id` must be a 36 character UUID')
        }
      }

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
        id,
        jenkinsJobName,
        jenkinsJobId,
        branch,
        commitSha,
      }
    })

    log.info('build received', body)
    const id = body.id || Uuid.v4()
    log.info('using id', id)

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
      if (
        error instanceof Es.errors.ResponseError &&
        error.statusCode === 409 &&
        body.id
      ) {
        throw new BadRequestError('specified uuid is not unique')
      }

      throw new Error('unable to create the build, try again later')
    }

    return {
      status: 201,
      body: { id },
    }
  }),
)
