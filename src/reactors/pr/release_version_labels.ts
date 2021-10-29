import { ReactorInput, PrReactor } from './pr_reactor'
import {
  RELEASE_BRANCH_RE,
  RELEASE_VERSION_LABEL_RE,
  InvalidLabelLog,
} from '../../lib'

const RELEVANT_ACTIONS: ReactorInput['action'][] = [
  'labeled',
  'unlabeled',
  'opened',
  'synchronize',
  'refresh',
  'ready_for_review',
]

export const releaseVersionLabels = new PrReactor({
  id: 'releaseVersionLabels',

  filter: ({ input: { action, pr } }) =>
    pr.state === 'open' && !pr.draft && RELEVANT_ACTIONS.includes(action),

  async exec({ input: { pr }, githubApi, es, log }) {
    const labelNames = pr.labels.map(label => label.name)
    const missingReleaseVersionLabel = !labelNames.some(n =>
      RELEASE_VERSION_LABEL_RE.test(n),
    )

    // we must check these in exec() since they can change over time so we don't want
    // to orphan a PR that became a backport PR or was retargetted away from main
    const isBasedOnReleaseBranch = RELEASE_BRANCH_RE.test(pr.base.ref)
    const isBackport = labelNames.includes('backport')

    if (isBasedOnReleaseBranch && missingReleaseVersionLabel && !isBackport) {
      await new InvalidLabelLog(es, log).add(pr.number)
      await githubApi.setCommitStatus(pr.head.sha, {
        context: 'prbot:release version labels',
        description: 'All PRs require at least one release version label',
        state: 'failure',
      })
    } else {
      await githubApi.setCommitStatus(pr.head.sha, {
        context: 'prbot:release version labels',
        state: 'success',
      })
    }

    return {
      pr: pr.number,
      prTitle: pr.title,
      labelNames,
      missingReleaseVersionLabel,
      isBasedOnReleaseBranch,
      isBackport,
    }
  },
})
