import { GithubApi } from './github_api'

const CACHE_VALID_DURATION_MS = 60_000

type FetchResult = {
  expireAt: number
  label: string
}

let latestVersionLabelCache: undefined | Promise<FetchResult>

async function fetchLatestVersionLabel(gh: GithubApi): Promise<FetchResult> {
  const json = await gh.getFileFromMain('package.json')
  return {
    // just in case the API call takes a while, we want to keep the cache for one minute from the time of response
    expireAt: Date.now() + CACHE_VALID_DURATION_MS,
    label: `v${JSON.parse(json).version}`,
  }
}

export async function getLatestVersionLabel(gh: GithubApi): Promise<string> {
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

    latestVersionLabelCache = fetchLatestVersionLabel(gh)
    const { label } = await latestVersionLabelCache
    return label
  }
}
