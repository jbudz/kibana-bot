import {
  requireDirectApiPassword,
  getRequestLogger,
  getGithubApi,
} from '../lib'
import { Route, BadRequestError } from '@spalger/micro-plus'
import { runPrReactors } from '../reactors'

export const refreshRoute = new Route(
  'GET',
  '/refresh',
  requireDirectApiPassword(async ctx => {
    const log = getRequestLogger(ctx)
    const githubApi = getGithubApi(ctx)

    const prId = ctx.query.id
    if (!prId) {
      throw new BadRequestError('missing ?id= param')
    }

    if (typeof prId !== 'string' || !/^\d+$/.test(prId)) {
      throw new BadRequestError('invalid ?id= param')
    }

    const pr = await githubApi.getPr(Number.parseInt(prId, 10))
    const body = await runPrReactors({
      force: true,
      context: {
        action: 'refresh',
        githubApi,
        log,
        pr,
      },
    })

    return { body }
  }),
)
