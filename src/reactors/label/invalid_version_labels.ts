import { ReactorInput, LabelReactor } from './label_reactor'

const RELEVANT_ACTIONS: ReactorInput['action'][] = ['refresh', 'created']

const VERSION_LIKE_RE = /^[\d\.]$/

export const invalidVersionLabels = new LabelReactor({
  id: 'invalidVersionLabels',

  filter: ({ input: { action, label } }) =>
    RELEVANT_ACTIONS.includes(action) && VERSION_LIKE_RE.test(label.name),

  async exec({ input: { label } }) {
    return {
      label: label.name,
      color: label.color,
    }
  },
})
