import { GithubWebhookCommitStatus } from '../../github_api_types'
import { Reactor } from '../reactor'
import { RELEASE_BRANCH_RE, getIncludesApmChanges } from '../../lib'

const APM_CI_CONTEXT = 'apm-ci/end2end/pr-merge'

export const invalidateApmCiFailures = new Reactor<GithubWebhookCommitStatus>({
  id: 'invalidateApmCiFailures',

  filter: ({ input }) =>
    input.context === APM_CI_CONTEXT &&
    (input.state === 'failure' || input.state === 'error') &&
    !input.branches.some(b => RELEASE_BRANCH_RE.test(b.name)),

  async exec({ input, githubApi, log }) {
    const { sha } = input.commit

    const isPrUpdatedSinceCommit: number[] = []
    const isPrIncludingApmChanges: number[] = []
    const isPrNotIncludingApmChanges: number[] = []

    for (const pr of await githubApi.getPrsAndFiles(sha)) {
      if (pr.lastCommitSha !== sha) {
        isPrUpdatedSinceCommit.push(pr.id)
        continue
      }

      if (!pr.hasMoreFiles && !getIncludesApmChanges(pr.files)) {
        isPrNotIncludingApmChanges.push(pr.id)
        continue
      }

      isPrIncludingApmChanges.push(pr.id)
    }

    if (isPrUpdatedSinceCommit.length) {
      log.info(
        'found %d prs with this commit which have been updated since: %j',
        isPrUpdatedSinceCommit.length,
        isPrUpdatedSinceCommit,
      )
    }

    if (isPrIncludingApmChanges.length) {
      log.info(
        'found %d prs with this commit which include apm changes: %j',
        isPrIncludingApmChanges.length,
        isPrIncludingApmChanges,
      )
    }

    if (isPrNotIncludingApmChanges.length) {
      log.info(
        'found %d prs with this commit which do not include apm changes: %j',
        isPrNotIncludingApmChanges.length,
        isPrNotIncludingApmChanges,
      )
    }

    if (isPrNotIncludingApmChanges.length && !isPrIncludingApmChanges.length) {
      log.info(
        `overwriting %j status of commit %j since it's not relevant`,
        APM_CI_CONTEXT,
        sha,
      )

      await githubApi.setCommitStatus(sha, {
        context: APM_CI_CONTEXT,
        state: 'success',
        description: `failure ignored because this PR doesn't contain apm changes`,
      })
    }

    return {
      isPrUpdatedSinceCommit,
      isPrIncludingApmChanges,
      isPrNotIncludingApmChanges,
    }
  },
})
