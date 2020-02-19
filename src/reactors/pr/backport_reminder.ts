import { ReactorInput, PrReactor } from './pr_reactor'
import {
  scheduleBackportReminder,
  clearBackportReminder,
  clearBackportMissingLabel,
} from '../../lib'

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
      await clearBackportMissingLabel(
        githubApi,
        pr.number,
        pr.labels.map(l => l.name),
      )

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
