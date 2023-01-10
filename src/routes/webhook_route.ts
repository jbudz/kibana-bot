import { Route, ServerError } from '@spalger/micro-plus'

import {
  parseWebhook,
  getGithubApi,
  getRequestLogger,
  getEsClient,
} from '../lib'
import {
  GithubWebhookIssueEvent,
  GithubWebhookPullRequestEvent,
  GithubWebhookPushEvent,
  GithubWebhookCommitStatus,
  GithubWebhookLabelEvent,
} from '../github_api_types'
import {
  runReactors,
  prReactors,
  issueReactors,
  pushReactors,
  statusReactors,
  labelReactors,
} from '../reactors'
import { LRUMap } from 'lru_map'

const queues = new Map<string, Array<() => void>>()
const lastPrHookTimes = new LRUMap<number, number>(1000)
const SECOND = 1000

export const webhookRoute = new Route('POST', '/webhook', async (ctx) => {
  const log = getRequestLogger(ctx)
  const githubApi = getGithubApi(ctx)

  const { event, webhook } = await parseWebhook(ctx, log)

  if (!event) {
    throw new ServerError(`unknown event [${event}]`)
  }

  log.info(`received webhook [${event}]`, {
    '@type': 'receivedWebhook',
    event,
    extra: {
      webhook,
    },
  })

  if (!queues.has(event)) {
    queues.set(event, [])
  }

  let run: (x: void) => void = () => {
    // noop
  }
  const pause = new Promise((resolve) => {
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
      case 'pull_request': {
        const wh = webhook as GithubWebhookPullRequestEvent
        const prId = wh.pull_request.number

        // determine and update the most recent webhook time for this PR
        const time = Date.now()
        const lastTime = lastPrHookTimes.get(prId)
        lastPrHookTimes.set(prId, time)

        const prFromApi = Boolean(lastTime && lastTime > time - 30 * SECOND)

        /**
         * fetch the current PR state if we received a webhook for this
         * PR in the last 30 seconds, when PRs are first created we get
         * a bunch of requests at once so we hope this will ensure PRs
         * are in the correct state when we inspect them.
         */
        const pr = prFromApi
          ? await githubApi.getPr(prId, { forceRetries: true })
          : wh.pull_request

        return {
          body: await runReactors(prReactors, {
            context: {
              input: {
                action: wh.action,
                pr,
                prFromApi,
              },
              githubApi,
              log,
              es: getEsClient(ctx),
            },
          }),
        }
      }

      case 'label': {
        const wh = webhook as GithubWebhookLabelEvent
        return {
          body: await runReactors(labelReactors, {
            context: {
              input: {
                action: wh.action,
                label: wh.label,
              },
              githubApi,
              es: getEsClient(ctx),
              log,
            },
          }),
        }
      }

      case 'issues': {
        const wh = webhook as GithubWebhookIssueEvent
        return {
          body: await runReactors(issueReactors, {
            context: {
              input: {
                action: wh.action,
                issue: wh.issue,
              },
              githubApi,
              log,
              es: getEsClient(ctx),
            },
          }),
        }
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
