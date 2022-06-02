import { Client } from '@elastic/elasticsearch'

import { GithubApi } from './github_api'
import { Log } from './log'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const FIRST_REMINDER_DAYS = 2
const FOLLOW_UP_REMINDER_DAYS = 1

export const BACKPORT_REMINDER_INDEX = 'prbot-backport-pr-reminders'

const BACKPORT_MISSING_LABEL = 'backport missing'

const DAY = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
}

const createBackportReminderComment = (
  prNumber: number,
  pendingPrs: number,
) => {
  if (pendingPrs === 0) {
    return (
      'Friendly reminder: Looks like this PR hasn’t been backported yet.\n' +
      `To create automatically backports add the label \`auto-backport\` or prevent reminders by adding the \`backport:skip\` label.\n` +
      `You can also create backports manually by running \`node scripts/backport --pr ${prNumber}\` locally`
    )
  }

  if (pendingPrs === 1) {
    return `Looks like this PR has a backport PR but it still hasn't been merged. Please merge it ASAP to keep the branches relatively in sync.`
  }

  return `Looks like this PR has backport PRs but they still haven't been merged. Please merge them ASAP to keep the branches relatively in sync.`
}

/**
 * Keep adding 24 hours to `time`, ignoing 24 hour periods that
 * land on a weekend, so that we will wait N workdays for things
 * to happen.
 * @param time
 * @param days
 */
export function addDaysToTimeExcludingWeekends(
  time: Date,
  workdays: number,
): Date {
  const newTime = new Date(time.valueOf() + HOUR * 24)

  if (
    newTime.getUTCDay() === DAY.SATURDAY ||
    newTime.getUTCDay() === DAY.SUNDAY
  ) {
    // keep the increment but don't decrement `workdays` because we landed on a weekend
    return addDaysToTimeExcludingWeekends(newTime, workdays)
  }

  if (workdays > 1) {
    // decrement `workdays` and continue to increment `newTime`
    return addDaysToTimeExcludingWeekends(newTime, workdays - 1)
  }

  return newTime
}

export async function scheduleBackportReminder(
  es: Client,
  log: Log,
  prNumber: number,
) {
  const selectParams = {
    index: BACKPORT_REMINDER_INDEX,
    id: `pr_${prNumber}`,
  }

  const existsResp = await es.exists<boolean>({ ...selectParams })
  const reminderTime = addDaysToTimeExcludingWeekends(
    new Date(),
    existsResp.body === true ? FOLLOW_UP_REMINDER_DAYS : FIRST_REMINDER_DAYS,
  )

  log.info(
    `scheduling pr backport reminder [pr ${prNumber}] [at ${reminderTime.toUTCString()}]`,
  )

  await es.index({
    ...selectParams,
    body: {
      prNumber,
      '@timestamp': reminderTime,
    },
  })
}

export async function clearBackportReminder(es: Client, prNumber: number) {
  await es.delete(
    {
      index: BACKPORT_REMINDER_INDEX,
      id: `pr_${prNumber}`,
    },
    {
      ignore: [404],
    },
  )
}

export async function clearBackportMissingLabel(
  githubApi: GithubApi,
  prNumber: number,
) {
  await githubApi.removeLabel(prNumber, BACKPORT_MISSING_LABEL)
}

export async function maybeSendBackportReminder({
  es,
  log,
  githubApi,
  prNumber,
}: {
  es: Client
  log: Log
  githubApi: GithubApi
  prNumber: number
}) {
  const { backportPrs, labels } = await githubApi.getBackportState(prNumber)

  /** PR NOT MERGED */
  if (backportPrs === undefined) {
    return {
      prNumber,
      ignored: 'pr is not merged',
    }
  }

  /** BACKPORTS EXIST AND ARE ALL MERGED */
  if (backportPrs.length && backportPrs.every(pr => pr.state === 'MERGED')) {
    await clearBackportReminder(es, prNumber)
    await clearBackportMissingLabel(githubApi, prNumber)

    return {
      prNumber,
      ignored: 'all backport prs are merged',
    }
  }

  /** BACKPORTS MISSING or NOT MERGED */

  // schedule/overwrite the backport reminder
  await scheduleBackportReminder(es, log, prNumber)

  // add the backport missing label if it's not already defined
  if (!labels.includes(BACKPORT_MISSING_LABEL)) {
    await githubApi.addLabel(prNumber, BACKPORT_MISSING_LABEL)
  }

  // comment on the pr about the missing backport
  await githubApi.addCommentToPr(
    prNumber,
    createBackportReminderComment(prNumber, backportPrs.length),
  )

  return {
    prNumber,
    commented: true,
  }
}
