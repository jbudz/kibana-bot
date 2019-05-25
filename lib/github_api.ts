import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import parseLinkHeader from 'parse-link-header'
import throttle from 'lodash.throttle'
import { getConfigVar } from '@spalger/micro-plus'

import { Log } from '../lib'
import { GithubApiPr, GithubApiCommit } from './github_api_types'
import { makeContextCache } from './req_cache'
import { getRequestLogger } from './log'

interface AxiosErrorResp extends AxiosError {
  request: any
  response: AxiosResponse
}

export const isAxiosErrorResp = (error: any): error is AxiosErrorResp =>
  error && error.request && error.response

type COMMIT_STATUS_STATE = 'error' | 'pending' | 'success' | 'failure'

interface CommitStatusOptions {
  status: COMMIT_STATUS_STATE
  context: string
  description?: string
  target_url?: string
}

const getCommitDate = (commit: GithubApiCommit) => {
  const committerDate = new Date(commit.committer.date)
  const authorDate = new Date(commit.author.date)
  return committerDate > authorDate ? committerDate : authorDate
}

export class GithubApi {
  private readonly ax: AxiosInstance
  private readonly throttledLogRateLimitInfo = throttle(
    (a: number, b: number) => this.logRateLimitInfo(a, b),
    10 * 1000,
  )

  public constructor(private log: Log, secret: string) {
    this.ax = axios.create({
      baseURL: 'https://api.github.com/',
      headers: {
        'User-Agent': 'spalger/kibana-pr-bot',
        Authorization: `token ${secret}`,
        Accept: 'application/vnd.github.shadow-cat-preview',
      },
    })
  }

  public async compare(headRef: string, baseRef: string) {
    const headComponent = encodeURIComponent(headRef)
    const baseComponent = encodeURIComponent(baseRef)
    const url = `/repos/elastic/kibana/compare/${headComponent}...${baseComponent}`

    const resp = await this.get(url)

    const {
      ahead_by: missingCommits,
      commits: [oldestMissingCommit],
    } = resp.data

    if (missingCommits > 0 && !oldestMissingCommit) {
      this.log.error(
        'unexpected github response, expected oldest missing commit',
        {
          missingCommits,
          respBody: resp.data,
        },
      )

      throw new Error('Unexpected github response')
    }

    if (!oldestMissingCommit) {
      return {
        missingCommits,
      }
    }

    const oldestMissingCommitDate = getCommitDate(oldestMissingCommit.commit)

    return {
      missingCommits,
      oldestMissingCommitDate,
    }
  }

  public async getCommitDate(ref: string) {
    const refComponent = encodeURIComponent(ref)
    const resp = await this.get(`/repos/elastic/kibana/commits/${refComponent}`)
    return getCommitDate(resp.data.commit)
  }

  public async setCommitStatus(ref: string, options: CommitStatusOptions) {
    const shaComponent = encodeURIComponent(ref)
    await this.post(`/repos/elastic/kibana/statuses/${shaComponent}`, options)
  }

  public async getPr(prId: number) {
    const prIdComponent = encodeURIComponent(`${prId}`)
    const resp = await this.get<GithubApiPr>(
      `/repos/elastic/kibana/pulls/${prIdComponent}`,
    )
    return resp.data
  }

  public async *ittrAllOpenPrs() {
    const urls: (string | null)[] = [null]

    const fetchInitialPage = async () => {
      this.log.info('fetching initial page of PRs')
      return await this.get<GithubApiPr[]>('/repos/elastic/kibana/pulls', {
        state: 'open',
      })
    }

    const fetchNextPage = async (url: string) => {
      console.log('fetching page of PRs', url)
      return await this.get<GithubApiPr[]>(url)
    }

    while (urls.length) {
      const url = urls.shift()!
      const page = await (url !== null
        ? fetchNextPage(url)
        : fetchInitialPage())

      for (const pr of page.data) {
        yield pr
      }

      if (!page.headers['link']) {
        throw new Error('missing link header')
      }

      const links = parseLinkHeader(page.headers['link'])
      if (!links) {
        throw new Error('unable to parse link header')
      }

      if (links.next) {
        urls.push(links.next.url)
      }
    }
  }

  private async get<Result = any>(
    url: string,
    params?: { [key: string]: any },
  ): Promise<AxiosResponse<Result>> {
    const resp = await this.ax({
      method: 'get',
      url,
      params,
    })

    this.checkForRateLimitInfo(resp)
    return resp
  }

  private async post<Result = any>(
    url: string,
    params?: { [key: string]: any },
    body?: { [key: string]: any },
  ): Promise<AxiosResponse<Result>> {
    const resp = await this.ax({
      method: 'post',
      url,
      params,
      data: body,
    })

    this.checkForRateLimitInfo(resp)
    return resp
  }

  private checkForRateLimitInfo(resp: AxiosResponse<any>) {
    if (
      resp.headers &&
      resp.headers['x-ratelimit-limit'] &&
      resp.headers['x-ratelimit-remaining']
    ) {
      this.throttledLogRateLimitInfo(
        Number.parseFloat(resp.headers['x-ratelimit-remaining']),
        Number.parseFloat(resp.headers['x-ratelimit-limit']),
      )
    }
  }

  private logRateLimitInfo(remaining: number, total: number) {
    this.log.info(`rate limit ${remaining}/${total}`, {
      type: 'githubRateLimit',
      rateLimit: {
        remaining,
        total,
      },
    })
  }
}

const githubApiCache = makeContextCache('github api', ctx => {
  return new GithubApi(getRequestLogger(ctx), getConfigVar('GITHUB_SECRET'))
})

export const getGithubApi = githubApiCache.get
export const assignGithubApi = githubApiCache.assignValue
