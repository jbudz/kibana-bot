import {
  requireDirectApiPassword,
  getGithubApi,
  getRequestLogger,
  BACKPORT_REMINDER_INDEX,
  maybeSendBackportReminder,
  scrollSearch,
  Route,
} from '../lib'

export const sendBackportRemindersRoute = new Route({
  method: 'GET',
  path: '/send_backport_reminders',
  handler: requireDirectApiPassword(async ctx => {
    const { es } = ctx.server
    const log = getRequestLogger(ctx)
    const githubApi = getGithubApi(ctx)

    const searchParams = {
      index: BACKPORT_REMINDER_INDEX,
      body: {
        sort: ['_doc'],
        query: {
          range: {
            '@timestamp': {
              lte: 'now',
            },
          },
        },
      },
    }

    const results = []
    for await (const hit of scrollSearch(es, searchParams)) {
      results.push(
        await maybeSendBackportReminder({
          es,
          log,
          githubApi,
          prNumber: hit._source.prNumber,
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
