import { requireDirectApiPassword, getGithubApi, getEsClient } from '../lib'
import { Route } from '@spalger/micro-plus'
import { applyOutdatedResult, scrollSearch } from '../lib'

export const refreshExpiredOutdatedRoute = new Route(
  'GET',
  '/refresh_expired_outdated',
  requireDirectApiPassword(async ctx => {
    const es = getEsClient(ctx)
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
)
