import { Route, ServerError } from '@spalger/micro-plus'

import {
  parseWebhook,
  GithubApiPr,
  getGithubApi,
  getRequestLogger,
} from '../lib'
import { runReactors, prReactors } from '../reactors'

export const webhookRoute = new Route('POST', '/webhook', async ctx => {
  const log = getRequestLogger(ctx)
  const githubApi = getGithubApi(ctx)

  const { event, webhook } = await parseWebhook(ctx, log)

  log.info(`received webhook [${event}]`, {
    event,
    data: {
      webhook,
    },
  })

  switch (event) {
    case 'pull_request':
      const { action, pull_request: pr } = webhook as {
        action: string
        pull_request: GithubApiPr
      }

      const body = await runReactors(prReactors, {
        context: {
          action,
          pr,
          githubApi,
          log,
        },
      })

      return { body }

    case 'push':
    case 'ping':
      return {
        statusCode: 200,
        body: {
          ignored: true,
        },
      }

    default:
      throw new ServerError(`unhandled event [${event}]`)
  }
})
