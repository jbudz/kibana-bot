import { Route, ServerError } from '@spalger/micro-plus'

import {
  parseWebhook,
  getGithubApi,
  getRequestLogger,
  getEsClient,
} from '../lib'
import {
  GithubWebhookPullRequestEvent,
  GithubWebhookPushEvent,
} from '../github_api_types'
import { runReactors, prReactors, pushReactors } from '../reactors'

export const webhookRoute = new Route('POST', '/webhook', async ctx => {
  const log = getRequestLogger(ctx)
  const githubApi = getGithubApi(ctx)

  const { event, webhook } = await parseWebhook(ctx, log)

  log.info(`received webhook [${event}]`, {
    '@type': 'receivedWebhook',
    event,
    data: {
      webhook,
    },
  })

  switch (event) {
    case 'pull_request':
      const wh = webhook as GithubWebhookPullRequestEvent
      return {
        body: await runReactors(prReactors, {
          context: {
            input: {
              action: wh.action,
              pr: wh.pull_request,
            },
            githubApi,
            log,
            es: getEsClient(ctx),
          },
        }),
      }

    case 'push':
      return {
        body: await runReactors(pushReactors, {
          context: {
            input: webhook as GithubWebhookPushEvent,
            githubApi,
            log,
            es: getEsClient(ctx),
          },
        }),
      }

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
