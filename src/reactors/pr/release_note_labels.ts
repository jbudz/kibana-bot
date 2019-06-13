import { ReactorInput, PrReactor } from './pr_reactor'

const RELEVANT_ACTIONS: ReactorInput['action'][] = [
  'labeled',
  'unlabeled',
  'opened',
  'synchronize',
  'refresh',
  'ready_for_review',
]

const RELEASE_BRANCH_RE = /^(master|\d+\.\d+|\d\.x)$/

export const releaseNoteLabels = new PrReactor({
  id: 'releaseNoteLabels',

  filter: ({ input: { action, pr } }) =>
    pr.state === 'open' &&
    !pr.draft &&
    !pr.labels.some(l => l.name === 'backport') &&
    RELEASE_BRANCH_RE.test(pr.base.ref) &&
    RELEVANT_ACTIONS.includes(action),

  async exec({ input: { pr }, githubApi }) {
    const labelNames = pr.labels.map(label => label.name)
    const missingReleaseNotesLabel = !labelNames.some(n =>
      n.startsWith('release_note:'),
    )

    if (missingReleaseNotesLabel) {
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
    }
  },
})
