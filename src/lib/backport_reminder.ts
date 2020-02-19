import { Client } from '@elastic/elasticsearch'

import { GithubApi } from './github_api'
import { Log } from './log'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const REMINDER_DELAY = 24 * HOUR

export const BACKPORT_REMINDER_INDEX = 'prbot-backport-pr-reminders'

const BACKPORT_MISSING_LABEL = 'backport missing'

const createBackportReminderComment = (
  prNumber: number,
  pendingPrs: number,
) => {
  if (pendingPrs === 0) {
    return (
      'Friendly reminder: Looks like this PR hasn’t been backported yet.\n' +
      `To create backports run \`node scripts/backport --pr ${prNumber}\` or prevent reminders by adding the \`backport:skip\` label.`
    )
  }

  if (pendingPrs === 1) {
    return `Looks like this PR has a backport PR but it still hasn't been merged. Please merge it ASAP to keep the branches relatively in sync.`
  }

  return `Looks like this PR has backport PRs but they still haven't been merged. Please merge them ASAP to keep the branches relatively in sync.`
}

export async function scheduleBackportReminder(
  es: Client,
  log: Log,
  prNumber: number,
) {
  const reminderTime = new Date(Date.now() + REMINDER_DELAY)
  log.info(
    `scheduling pr backport reminder [pr ${prNumber}] [at ${reminderTime.toUTCString()}]`,
  )

  await es.index({
    index: BACKPORT_REMINDER_INDEX,
    id: `pr_${prNumber}`,
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
  labels: string[],
) {
  const cleanLabels = labels.filter(l => l !== BACKPORT_MISSING_LABEL)
  if (cleanLabels.length !== labels.length) {
    await githubApi.setPrLabels(prNumber, cleanLabels)
  }
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
    await clearBackportMissingLabel(githubApi, prNumber, labels)

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
    await githubApi.setPrLabels(prNumber, [...labels, BACKPORT_MISSING_LABEL])
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
