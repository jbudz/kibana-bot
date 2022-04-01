import { GithubApi } from './github_api'
import { Log } from './log'

const CACHE_VALID_DURATION_MS = 60_000

type FetchResult = {
  expireAt: number
  label: string
}

let latestVersionLabelCache: undefined | Promise<FetchResult>

async function fetchLatestVersionLabel(
  log: Log,
  gh: GithubApi,
): Promise<FetchResult> {
  log.info('fetching latest version label from github')
  const json = await gh.getFileFromMain('package.json')
  const { version } = JSON.parse(json)
  const label = `v${version}`

  log.info(`latest version label is ${label}`)

  return {
    // just in case the API call takes a while, we want to keep the cache for one minute from the time of response
    expireAt: Date.now() + CACHE_VALID_DURATION_MS,
    label: label,
  }
}

export async function getLatestVersionLabel(log: Log, gh: GithubApi) {
  while (true) {
    const cachePromise = latestVersionLabelCache
    if (cachePromise) {
      const { expireAt, label } = await cachePromise
      if (Date.now() < expireAt) {
        return label
      }

      // another execution of this function already refetched the cache so just start over
      if (latestVersionLabelCache !== cachePromise) {
        continue
      }
    }

    latestVersionLabelCache = fetchLatestVersionLabel(log, gh)
    const { label } = await latestVersionLabelCache
    return label
  }
}
