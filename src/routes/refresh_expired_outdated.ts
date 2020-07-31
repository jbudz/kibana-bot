import {
  Route,
  requireDirectApiPassword,
  getGithubApi,
  applyOutdatedResult,
  scrollSearch,
} from '../lib'

export const refreshExpiredOutdatedRoute = new Route({
  method: 'GET',
  path: '/refresh_expired_outdated',
  handler: requireDirectApiPassword(async ctx => {
    const { es } = ctx.server
    const githubApi = getGithubApi(ctx)

    const searchParams = {
      index: 'prbot-pr-expiration-times',
      body: {
        sort: ['_doc'],
        query: {
          range: {
            expirationTime: {
              lte: 'now',
            },
          },
        },
      },
    }

    const results = []
    for await (const hit of scrollSearch(es, searchParams)) {
      results.push(
        await applyOutdatedResult({
          es,
          githubApi,
          prHeadSha: hit._source.prHeadSha,
          prNumber: hit._source.prNumber,
          prUserLogin: hit._source.prUserLogin,
        }),
      )
    }

    return {
      body: {
        results,
      },
    }
  }),
})
