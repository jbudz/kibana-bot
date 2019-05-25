import { PrReactor } from '../pr_reactor'

export const releaseNoteLabels = new PrReactor({
  id: 'releaseNoteLabels',

  filter: ({ pr, action }) =>
    pr.state === 'open' &&
    ['labeled', 'unlabeled', 'opened', 'synchronize'].includes(action) &&
    pr.labels.some(label => label.name === ':Canvas'),

  async exec({ pr, log }) {
    const hasReleaseNotesLabel = pr.labels.some(label =>
      label.name.startsWith('release_note:'),
    )

    log.info('canvas issue relase notes', {
      hasReleaseNotesLabel,
      labelNames: pr.labels.map(label => label.name),
    })

    return { hasReleaseNotesLabel }
  },
})
