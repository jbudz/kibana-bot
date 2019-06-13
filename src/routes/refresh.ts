import {
  requireDirectApiPassword,
  getRequestLogger,
  getGithubApi,
  getEsClient,
} from '../lib'
import { Route, BadRequestError } from '@spalger/micro-plus'
import { runReactors, prReactors } from '../reactors'

export const refreshRoute = new Route(
  'GET',
  '/refresh',
  requireDirectApiPassword(async ctx => {
    const log = getRequestLogger(ctx)
    const es = getEsClient(ctx)
    const githubApi = getGithubApi(ctx)

    const prId = ctx.query.id
    if (!prId) {
      throw new BadRequestError('missing ?id= param')
    }
    if (typeof prId !== 'string' || !/^\d+$/.test(prId)) {
      throw new BadRequestError('invalid ?id= param')
    }

    const reactorId = ctx.query.reactor
    if (reactorId && typeof reactorId !== 'string') {
      throw new BadRequestError('invalid ?reactor= param')
    }

    const pr = await githubApi.getPr(Number.parseInt(prId, 10))
    const body = await runReactors(
      prReactors.filter(r => !reactorId || r.id === reactorId),
      {
        context: {
          input: {
            action: 'refresh',
            pr,
          },
          githubApi,
          log,
          es,
        },
      },
    )

    return { body }
  }),
)
