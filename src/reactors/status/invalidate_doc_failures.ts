import { GithubWebhookCommitStatus } from '../../github_api_types'
import { Reactor } from '../reactor'
import { RELEASE_BRANCH_RE, getIncludesDocsSiteChanges } from '../../lib'

const ES_DOCS_CONTEXT = 'elasticsearch-ci/docs'

export const invalidateDocFailures = new Reactor<GithubWebhookCommitStatus>({
  id: 'invalidateDocFailures',

  filter: ({ input }) =>
    input.context === ES_DOCS_CONTEXT &&
    input.state === 'failure' &&
    !input.branches.some(b => RELEASE_BRANCH_RE.test(b.name)),

  async exec({ input, githubApi, log }) {
    const { sha } = input.commit

    const isPrUpdatedSinceCommit: number[] = []
    const isPrIncludingDocs: number[] = []
    const isPrNotIncludingDocs: number[] = []

    for (const pr of await githubApi.getPrsAndFiles(sha)) {
      if (pr.updatedSinceCommit) {
        isPrUpdatedSinceCommit.push(pr.id)
        continue
      }

      if (!getIncludesDocsSiteChanges(pr.files)) {
        isPrNotIncludingDocs.push(pr.id)
        continue
      }

      isPrIncludingDocs.push(pr.id)
    }

    if (isPrUpdatedSinceCommit.length) {
      log.info({
        type: 'invalidateDocCiFailures - found updated prs',
        message: `found ${isPrUpdatedSinceCommit.length} prs with this commit which have been updated since`,
        extra: {
          isPrUpdatedSinceCommit,
        },
      })
    }

    if (isPrIncludingDocs.length) {
      log.info({
        type: 'invalidateDocCiFailures - found prs including doc changes',
        message: `found ${isPrIncludingDocs.length} prs with this commit which include doc changes`,
        extra: {
          isPrIncludingDocs,
        },
      })
    }

    if (isPrNotIncludingDocs.length) {
      log.info({
        type: 'invalidateDocCiFailures - found prs not including doc changes',
        message: `found ${isPrNotIncludingDocs.length} prs with this commit which do not include doc changes`,
        extra: {
          isPrNotIncludingDocs,
        },
      })
    }

    if (isPrNotIncludingDocs.length && !isPrIncludingDocs.length) {
      log.info({
        type: 'invalidateDocCiFailures - overwriting',
        extra: {
          sha,
        },
      })

      await githubApi.setCommitStatus(sha, {
        context: ES_DOCS_CONTEXT,
        state: 'success',
        description: `failure ignored because this PR doesn't contain docs`,
      })
    }

    return {
      isPrUpdatedSinceCommit,
      isPrIncludingDocs,
      isPrNotIncludingDocs,
    }
  },
})
