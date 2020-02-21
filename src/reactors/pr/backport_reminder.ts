import { ReactorInput, PrReactor } from './pr_reactor'
import {
  scheduleBackportReminder,
  clearBackportReminder,
  clearBackportMissingLabel,
  RELEASE_BRANCH_RE,
} from '../../lib'

const RELEVANT_ACTIONS: ReactorInput['action'][] = [
  'refresh',
  'labeled',
  'closed',
]

export const backportReminder = new PrReactor({
  id: 'backportReminder',

  filter: ({ input: { action, pr } }) =>
    RELEVANT_ACTIONS.includes(action) &&
    RELEASE_BRANCH_RE.test(pr.base.ref) &&
    pr.merged,

  async exec({ input: { pr }, es, log, githubApi }) {
    if (pr.base.ref !== 'master') {
      if (!pr.labels.some(l => l.name === 'backport')) {
        return {
          pr: pr.number,
          notABackportPr: true,
        }
      }

      const titleMatch = pr.title.match(/\(#(\d+)\)/)
      if (!titleMatch) {
        return {
          pr: pr.number,
          unableToExtractSourcePrNumber: true,
        }
      }

      const srcPrNum = Number.parseInt(titleMatch[1], 10)
      const { backportPrs, labels } = await githubApi.getBackportState(srcPrNum)

      // backports don't exist somehow or some are not merged
      if (
        !backportPrs ||
        !backportPrs.length ||
        backportPrs.some(pr => pr.state !== 'MERGED')
      ) {
        return {
          pr: pr.number,
          sourcePrIsNotDoneWithBackports: true,
        }
      }

      await clearBackportReminder(es, srcPrNum)
      await clearBackportMissingLabel(githubApi, srcPrNum, labels)
      return {
        pr: pr.number,
        clearedRemindersFromSource: true,
      }
    }

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
