import humaizeDuration from 'humanize-duration'

import { GithubApi, isAxiosErrorResp } from './github_api'
import { GithubApiPr } from './github_api_types'

const SECOND = 1000
const MINUTE = SECOND * 60
const HOUR = MINUTE * 60

const retryOn404 = async <T>(fn: () => T) => {
  let attempt = 0

  while (true) {
    attempt += 1

    try {
      return await fn()
    } catch (error) {
      if (
        isAxiosErrorResp(error) &&
        error.response.status === 404 &&
        attempt < 3
      ) {
        console.warn(
          'Github responded with a 404, waiting 2 seconds and retrying [attempt=%d]',
          attempt,
        )
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }

      if (isAxiosErrorResp(error)) {
        console.error(
          'GITHUB API ERROR RESPONSE:\n  attempt: %d\n  url: %s\n  status: %s\n  data: %j',
          attempt,
          error.request.url,
          `${error.response.status} - ${error.response.statusText}`,
          error.response.data,
        )
      }

      throw error
    }
  }
}

export async function checkPr(githubApi: GithubApi, pr: GithubApiPr) {
  console.log('checking pr #%s', pr.number)

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
}
