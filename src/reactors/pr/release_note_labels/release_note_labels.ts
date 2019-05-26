import { PrReactor } from '../pr_reactor'

const RELEVANT_ACTIONS = [
  'labeled',
  'unlabeled',
  'opened',
  'synchronize',
  'refresh',
  'ready_for_review',
]

export const releaseNoteLabels = new PrReactor({
  id: 'releaseNoteLabels',

  filter: ({ pr, action }) =>
    pr.state === 'open' &&
    !pr.draft &&
    RELEVANT_ACTIONS.includes(action) &&
    (pr.user.login === 'spalger' ||
      pr.labels.some(label => label.name === ':Canvas')),

  async exec({ pr, githubApi, log }) {
    const hasReleaseNotesLabel = pr.labels.some(label =>
      label.name.startsWith('release_note:'),
    )

    log.info('checked for release note labels', {
      '@type': 'releaseNoteLabels:result',
      hasReleaseNotesLabel,
      labelNames: pr.labels.map(label => label.name),
    })

    if (pr.title.includes('test stale pr bot')) {
      if (hasReleaseNotesLabel) {
        await githubApi.setCommitStatus(pr.head.sha, {
          context: 'prbot:release note labels',
          state: 'success',
        })
      } else {
        await githubApi.setCommitStatus(pr.head.sha, {
          context: 'prbot:release note labels',
          description: 'release_note:* label missing',
          state: 'failure',
        })
      }
    }

    return { hasReleaseNotesLabel }
  },
})
