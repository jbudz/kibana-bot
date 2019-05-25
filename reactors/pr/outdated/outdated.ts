import humaizeDuration from 'humanize-duration'

import { PrReactor } from '../pr_reactor'
import { retryOn404 } from './retry_on_404'

const SECOND = 1000
const MINUTE = SECOND * 60
const HOUR = MINUTE * 60

const RELEVANT_ACTIONS = ['opened', 'synchronize', 'refresh']

export const outdated = new PrReactor({
  id: 'outdated',

  filter({ action }) {
    return RELEVANT_ACTIONS.includes(action)
  },

  async exec({ log, githubApi, pr }) {
    log.info(`running outdated #${pr.number}`, {
      prNumber: pr.number,
    })

    const compare = await retryOn404(
      async () => await githubApi.compare(pr.head.sha, pr.base.label),
    )

    let latestCommitDate: Date | void
    let timeBehind: number | void
    let timeBehindHuman: string | void

    if (compare.oldestMissingCommitDate) {
      latestCommitDate = await githubApi.getCommitDate(pr.base.ref)
      timeBehind =
        latestCommitDate.valueOf() - compare.oldestMissingCommitDate.valueOf()
      timeBehindHuman = humaizeDuration(timeBehind, {
        units: ['d', 'h'],
        maxDecimalPoints: 1,
      })
    }

    const commitStatus = timeBehind > 48 * HOUR ? 'failure' : 'success'

    return {
      number: pr.number,
      state: pr.state,
      latestCommitDate,
      timeBehindHuman,
      commitStatus,
      ...compare,
    }
  },
})
