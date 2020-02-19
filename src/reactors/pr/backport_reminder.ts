import { ReactorInput, PrReactor } from './pr_reactor'
import { scheduleBackportReminder, clearBackportReminder } from '../../lib'

const RELEVANT_ACTIONS: ReactorInput['action'][] = [
  'refresh',
  'labeled',
  'closed',
]

export const backportReminder = new PrReactor({
  id: 'backportReminder',

  filter: ({ input: { action, pr } }) =>
    RELEVANT_ACTIONS.includes(action) && pr.merged && pr.base.ref === 'master',

  async exec({ input: { pr }, es, log, githubApi }) {
    if (pr.labels.some(l => l.name === 'backport:skip')) {
      await clearBackportReminder(es, pr.number)

      const cleanLabels = pr.labels
        .filter(l => l.name === 'backport missing')
        .map(l => l.name)

      if (cleanLabels.length !== pr.labels.length) {
        await githubApi.setPrLabels(pr.number, cleanLabels)
      }

      return {
        pr: pr.number,
        reminderCleared: 'pr has backport:skip label',
      }
    }

    const reminderTime = await scheduleBackportReminder(es, log, pr.number)

    return {
      pr: pr.number,
      reminderTime,
    }
  },
})
