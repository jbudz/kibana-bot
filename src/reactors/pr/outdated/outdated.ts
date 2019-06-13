import { ReactorInput, PrReactor } from '../pr_reactor'
import { retryOn404 } from './retry_on_404'
import {
  getOldestMissingCommitDate,
  applyOutdatedResult,
  clearExpirationTime,
} from '../../../lib'

const RELEVANT_ACTIONS: ReactorInput['action'][] = [
  'opened',
  'synchronize',
  'ready_for_review',
  'reopened',
  'refresh',
  'closed',
]

export const outdated = new PrReactor({
  id: 'outdated',

  filter: ({ input }) =>
    !input.pr.draft && RELEVANT_ACTIONS.includes(input.action),

  async exec({ githubApi, input: { pr, action }, es }) {
    // when prs are closed, or if they were previously closed and
    // we're refreshing, then cleanup
    if (action === 'closed' || pr.closed_at) {
      await clearExpirationTime(es, pr.number)
      return { pr: pr.number, closed: true }
    }

    const { totalMissingCommits, missingCommits } = await retryOn404(
      async () => await githubApi.compare(pr.head.sha, pr.base.label),
    )

    let timeBehind = 0,
      oldestMissingCommitDate,
      oldestMissingCommitCommiterDate

    if (totalMissingCommits > 0) {
      const oldestMissingCommit = missingCommits[0]
      oldestMissingCommitDate = await getOldestMissingCommitDate(
        es,
        oldestMissingCommit.sha,
      )

      if (oldestMissingCommitDate) {
        timeBehind = Date.now() - oldestMissingCommitDate.valueOf()
      }
    }

    if (totalMissingCommits > 0 && !oldestMissingCommitDate) {
      const oldestMissingCommit = missingCommits[0]
      oldestMissingCommitCommiterDate = await githubApi.getCommitDate(
        oldestMissingCommit.sha,
      )

      timeBehind = Date.now() - oldestMissingCommitCommiterDate.valueOf()
    }

    return {
      pr: pr.number,
      totalMissingCommits,
      oldestMissingCommitSha: missingCommits[0] && missingCommits[0].sha,
      oldestMissingCommitDate,
      oldestMissingCommitCommiterDate,
      timeBehind,
      ...(await applyOutdatedResult({
        es,
        githubApi,
        prNumber: pr.number,
        prHeadSha: pr.head.sha,
        prUserLogin: pr.user.login,
        timeBehind,
      })),
    }
  },
})
