import { GithubWebhookPushEvent } from '../../github_api_types'
import { Reactor } from '../reactor'
import { RELEASE_BRANCH_RE } from '../../lib'

export const storePushTime = new Reactor<GithubWebhookPushEvent>({
  id: 'storePushTime',

  filter: ({ input }) =>
    !input.deleted &&
    RELEASE_BRANCH_RE.test(input.ref.replace('refs/heads/', '')),

  async exec({ input, es, log }) {
    const body = []

    if (input.forced) {
      log.info('force push', {
        '@type': 'forcePush',
        data: input,
      })
    }

    for (const commit of input.commits) {
      body.push({ create: { _id: commit.id } })
      body.push({ pushTime: new Date() })
    }

    if (!body.length) {
      return {
        commits: 0,
      }
    }

    return await es.bulk({
      index: 'prbot-commit-times',
      body,
    })
  },
})
