import { ReactorInput, PrReactor } from '../pr_reactor'
import { retryOn404 } from './retry_on_404'
import {
  getOldestMissingCommitDate,
  applyOutdatedResult,
  clearExpirationTime,
  getIsDocsOnlyChange,
} from '../../../lib'

const RELEVANT_ACTIONS: ReactorInput['action'][] = [
  'opened',
  'synchronize',
  'ready_for_review',
  'reopened',
  'refresh',
  'closed',
]

const REQUIRED_COMMITS: { [branch: string]: string[] | undefined } = {
  master: ['48c5df2e98fcf0eb9d08a4fae3bc4a36cb1ca78f'],
  '7.x': ['4334922c220569a97ca4dbd870acf26bef9b5aab'],
}

const IGNORED_BRANCHES = ['feature/lens', 'feature-integrations-manager']

export const outdated = new PrReactor({
  id: 'outdated',

  filter: ({ input }) =>
    !input.pr.draft && RELEVANT_ACTIONS.includes(input.action),

  async exec({ githubApi, input: { pr, action }, es, log }) {
    // when prs are closed, or if they were previously closed and
    // we're refreshing, then cleanup
    if (action === 'closed' || pr.closed_at) {
      await clearExpirationTime(es, pr.number)
      return { pr: pr.number, closed: true }
    }

    let ignoredBecause: string | undefined

    if (IGNORED_BRANCHES.includes(pr.base.ref)) {
      ignoredBecause = `ignoredBaseBranch: ${pr.base.ref}`
    } else if (getIsDocsOnlyChange(await githubApi.getPrFiles(pr.number))) {
      ignoredBecause = `docs only change`
    }

    if (ignoredBecause) {
      const headStatus = await githubApi.getCommitStatus(pr.head.sha)
      const outdatedStatus = headStatus.statuses.find(
        s => s.context === 'prbot:outdated',
      )

      if (!outdatedStatus) {
        return {
          pr: pr.number,
          ignoredBecause,
        }
      }

      await clearExpirationTime(es, pr.number)

      if (outdatedStatus.state === 'failure') {
        return {
          pr: pr.number,
          ignoredBecause,
          ...(await applyOutdatedResult({
            es,
            githubApi,
            prNumber: pr.number,
            prHeadSha: pr.head.sha,
            prUserLogin: pr.user.login,
            timeBehind: 0,
            missingRequiredCommit: false,
          })),
        }
      }
    }

    const { totalMissingCommits, missingCommits } = await retryOn404(
      log,
      async () => await githubApi.compare(pr.head.sha, pr.base.label),
    )

    let timeBehind = 0,
      oldestMissingCommitDate,
      oldestMissingCommitCommiterDate

    const requiredCommits = REQUIRED_COMMITS[pr.base.ref] || []
    const missingRequiredCommits = missingCommits.filter(c =>
      requiredCommits.includes(c.sha),
    ).length

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
        missingRequiredCommit: missingRequiredCommits > 0,
      })),
    }
  },
})
