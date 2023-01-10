import {
  requireDirectApiPassword,
  getGithubApi,
  getEsClient,
  getRequestLogger,
  BACKPORT_REMINDER_INDEX,
  maybeSendBackportReminder,
  scrollSearch,
} from '../lib'
import { Route } from '@spalger/micro-plus'

export const sendBackportRemindersRoute = new Route(
  'GET',
  '/send_backport_reminders',
  requireDirectApiPassword(async (ctx) => {
    const es = getEsClient(ctx)
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
)
