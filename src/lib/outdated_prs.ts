import { Client } from '@elastic/elasticsearch'

import { GithubApi } from './github_api'
import { recordCommitStatus } from './es'

const SECOND = 1000
const MINUTE = SECOND * 60
const HOUR = MINUTE * 60

export const TIME_LIMIT = 48 * HOUR
const INDEX_NAME = 'prbot-pr-expiration-times'

export async function clearExpirationTime(es: Client, prNumber: number) {
  await es.delete(
    {
      index: INDEX_NAME,
      id: `pr_${prNumber}`,
    },
    {
      ignore: [404],
    },
  )
}

export async function applyOutdatedResult({
  es,
  githubApi,
  prNumber,
  prHeadSha,
  prUserLogin,
  timeBehind = TIME_LIMIT,
  missingRequiredCommit = false
}: {
  es: Client
  githubApi: GithubApi
  prNumber: number
  prHeadSha: string
  prUserLogin: string
  timeBehind?: number
  missingRequiredCommit?: boolean
}) {
  const success = timeBehind < TIME_LIMIT && !missingRequiredCommit

  /**
   * Store/clear the expiration time of success statuses
   */
  const expirationTime = new Date(Date.now() + (48 * HOUR - (timeBehind || 0)))
  if (success) {
    await es.index({
      index: INDEX_NAME,
      id: `pr_${prNumber}`,
      body: {
        expirationTime,
        prNumber,
        prHeadSha,
        prUserLogin,
      },
    })
  } else {
    await clearExpirationTime(es, prNumber)
  }

  /**
   * Record commit status
   */
  const state = success ? ('success' as const) : ('failure' as const)
  const update = `run \`node scripts/update_prs ${prNumber}\` to update`
  const reason = (timeBehind > TIME_LIMIT ? `, > 48h old` : '') + (missingRequiredCommit ? `, missing required commit` : '')
  const commitStatus = {
    context: 'prbot:outdated',
    state,
    description: update + reason,
  }

  await recordCommitStatus(es, prNumber, prHeadSha, commitStatus)
  await githubApi.setCommitStatus(prHeadSha, commitStatus)

  /** fin */
  return {
    commitStatus,
    expirationTime,
  }
}
