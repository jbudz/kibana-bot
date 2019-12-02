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
  GithubWebhookCommitStatus,
} from '../github_api_types'
import {
  runReactors,
  prReactors,
  pushReactors,
  statusReactors,
} from '../reactors'

const queues = new Map<string, Array<() => void>>()

export const webhookRoute = new Route('POST', '/webhook', async ctx => {
  const log = getRequestLogger(ctx)
  const githubApi = getGithubApi(ctx)

  const { event, webhook } = await parseWebhook(ctx, log)

  if (!event) {
    throw new ServerError(`unknown event [${event}]`)
  }

  log.info(`received webhook [${event}]`, {
    '@type': 'receivedWebhook',
    event,
    data: {
      webhook,
    },
  })

  if (!queues.has(event)) {
    queues.set(event, [])
  }

  let run = () => {
    // noop
  }
  const pause = new Promise(resolve => {
    run = resolve
  })

  const queue = queues.get(event)!

  if (queue.length === 0) {
    run()
  } else {
    queue.push(run)
  }

  try {
    await pause

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

      case 'status':
        return {
          body: await runReactors(statusReactors, {
            context: {
              input: webhook as GithubWebhookCommitStatus,
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
  } finally {
    if (queue.length) {
      const next = queue.shift()!
      next()
    }
  }
})
