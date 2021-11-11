import { ReactorInput, PrReactor } from './pr_reactor'
import {
  scheduleBackportReminder,
  clearBackportReminder,
  clearBackportMissingLabel,
  RELEASE_BRANCH_RE,
  RELEASE_VERSION_LABEL_RE,
  isGqlRespError,
  GithubApi,
} from '../../lib'
import { GithubApiPr } from '../../github_api_types'

const RELEVANT_ACTIONS: ReactorInput['action'][] = [
  'refresh',
  'labeled',
  'closed',
]

const CURRENT_MAIN_VERSION = 'v8.1.0'
const DISABLE_LABELS = ['backport:skip', 'backported', 'reverted']

async function findSourcePrState(githubApi: GithubApi, pr: GithubApiPr) {
  for (const [, numberInTitle] of [...pr.title.matchAll(/\(#(\d+)\)/g)]) {
    try {
      const srcPrNum = Number.parseInt(numberInTitle, 10)
      return {
        srcPrNum,
        ...(await githubApi.getBackportState(srcPrNum)),
      }
    } catch (error) {
      if (
        isGqlRespError(error) &&
        error.resp.errors.some(e => e.type === 'NOT_FOUND')
      ) {
        // try the next match
        continue
      }

      throw error
    }
  }
}

export const backportReminder = new PrReactor({
  id: 'backportReminder',

  filter: ({ input: { action, pr } }) =>
    RELEVANT_ACTIONS.includes(action) &&
    RELEASE_BRANCH_RE.test(pr.base.ref) &&
    pr.merged,

  async exec({ input: { pr }, es, log, githubApi }) {
    if (pr.base.ref !== 'main' && pr.base.ref !== 'master') {
      if (!pr.labels.some(l => l.name === 'backport')) {
        return {
          pr: pr.number,
          notABackportPr: true,
        }
      }

      const prState = await findSourcePrState(githubApi, pr)
      if (!prState) {
        return {
          pr: pr.number,
          unableToExtractSourcePrNumber: true,
        }
      }

      const { srcPrNum, backportPrs, labels } = prState

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

    const disableLabel = pr.labels.find(l => DISABLE_LABELS.includes(l.name))
    if (disableLabel) {
      await clearBackportReminder(es, pr.number)
      await clearBackportMissingLabel(
        githubApi,
        pr.number,
        pr.labels.map(l => l.name),
      )

      return {
        pr: pr.number,
        reminderCleared: `pr has "${disableLabel}" label`,
      }
    }

    const versionLabels = pr.labels.filter(l =>
      RELEASE_VERSION_LABEL_RE.test(l.name),
    )
    if (
      versionLabels.length === 1 &&
      versionLabels[0].name === CURRENT_MAIN_VERSION
    ) {
      await clearBackportReminder(es, pr.number)
      await clearBackportMissingLabel(
        githubApi,
        pr.number,
        pr.labels.map(l => l.name),
      )
      await githubApi.addLabel(pr.number, 'backport:skip')

      return {
        pr: pr.number,
        reminderCleared: `pr is only backported to current main version`,
      }
    }

    const reminderTime = await scheduleBackportReminder(es, log, pr.number)

    return {
      pr: pr.number,
      reminderTime,
    }
  },
})
