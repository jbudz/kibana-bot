import { GithubWebhookPushEvent } from '../../github_api_types'
import { Reactor } from '../reactor'
import { RELEASE_BRANCH_RE } from '../../lib'

export const storePushTime = new Reactor<GithubWebhookPushEvent>({
  id: 'storePushTime',

  filter: ({ input }) =>
    !input.deleted &&
    RELEASE_BRANCH_RE.test(input.ref.replace('refs/heads/', '')),

  async exec({ input, es, log, githubApi }) {
    const body = []

    if (input.forced) {
      log.info('force push', {
        '@type': 'forcePush',
        extra: input,
      })
    }

    const setStatusPromises: Array<Promise<void>> = []

    for (const commit of input.commits) {
      const pushTime = new Date()
      body.push({ create: { _id: commit.id } })
      body.push({ pushTime })

      setStatusPromises.push(
        githubApi
          .setCommitStatus(commit.id, {
            context: 'prbot:storeCommitTime',
            state: 'success',
            description: `push time: ${pushTime.toISOString()}`,
          })
          .then(
            () => undefined,
            () => undefined,
          ),
      )
    }

    if (!body.length) {
      return {
        commits: 0,
      }
    }

    try {
      return await es.bulk({
        index: 'prbot-commit-times',
        body,
      })
    } finally {
      await Promise.all(setStatusPromises)
    }
  },
})
