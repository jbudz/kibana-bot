import { PrReactor } from '../pr_reactor'

const RELEVANT_ACTIONS = [
  'labeled',
  'unlabeled',
  'opened',
  'synchronize',
  'refresh',
]

export const releaseNoteLabels = new PrReactor({
  id: 'releaseNoteLabels',

  filter: ({ pr, action }) =>
    pr.state === 'open' &&
    RELEVANT_ACTIONS.includes(action) &&
    pr.labels.some(label => label.name === ':Canvas'),

  async exec({ pr, log }) {
    const hasReleaseNotesLabel = pr.labels.some(label =>
      label.name.startsWith('release_note:'),
    )

    log.info('checked for release note labels', {
      '@type': 'releaseNoteLabels:result',
      hasReleaseNotesLabel,
      labelNames: pr.labels.map(label => label.name),
    })

    return { hasReleaseNotesLabel }
  },
})
