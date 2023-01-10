import { ReactorInput, PrReactor } from './pr_reactor'
import { RELEASE_BRANCH_RE, InvalidLabelLog } from '../../lib'

const RELEVANT_ACTIONS: ReactorInput['action'][] = [
  'labeled',
  'unlabeled',
  'opened',
  'synchronize',
  'refresh',
  'ready_for_review',
]

export const releaseNoteLabels = new PrReactor({
  id: 'releaseNoteLabels',

  filter: ({ input: { action, pr } }) =>
    pr.state === 'open' && RELEVANT_ACTIONS.includes(action),

  async exec({ input: { pr }, githubApi, es, log }) {
    if (pr.draft) {
      await githubApi.setCommitStatus(pr.head.sha, {
        context: 'prbot:release note labels',
        description: 'Draft PRs do not require release note labels',
        state: 'success',
      })
      return {
        pr: pr.number,
        draft: true,
      }
    }

    const labelNames = pr.labels.map((label) => label.name)
    const missingReleaseNotesLabel = !labelNames.some((n) =>
      n.startsWith('release_note:'),
    )

    // we must check these in exec() since they can change over time so we don't want
    // to orphan a PR that became a backport PR or was retargetted away from main
    const isBasedOnReleaseBranch = RELEASE_BRANCH_RE.test(pr.base.ref)
    const isBackport = labelNames.includes('backport')

    if (isBasedOnReleaseBranch && missingReleaseNotesLabel && !isBackport) {
      await new InvalidLabelLog(es, log).add(pr.number)
      await githubApi.setCommitStatus(pr.head.sha, {
        context: 'prbot:release note labels',
        description: 'All PRs require a release_note:* label',
        state: 'failure',
      })
    } else {
      await githubApi.setCommitStatus(pr.head.sha, {
        context: 'prbot:release note labels',
        state: 'success',
      })
    }

    return {
      pr: pr.number,
      prTitle: pr.title,
      labelNames,
      missingReleaseNotesLabel,
      isBasedOnReleaseBranch,
      isBackport,
    }
  },
})
