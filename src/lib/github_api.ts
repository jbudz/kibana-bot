import Axios, { AxiosResponse, AxiosError, Method } from 'Axios'
import parseLinkHeader from 'parse-link-header'
import throttle from 'lodash.throttle'
import { getConfigVar } from '@spalger/micro-plus'
import gql from 'graphql-tag'
import { print } from 'graphql/language/printer'
import { ASTNode } from 'graphql/language/ast'

import { Log } from '../lib'
import {
  GithubApiPr,
  GithubApiCompare,
  Commit,
  GithubApiCompareCommit,
  CombinedCommitStatus,
  GithubApiPullRequestFiles,
  SearchResults,
  PrSearchResult,
  PrCommit,
} from '../github_api_types'
import { makeContextCache } from './req_cache'
import { getRequestLogger } from './log'

interface AxiosErrorReq extends AxiosError {
  request: any
}

interface AxiosErrorResp extends AxiosErrorReq {
  response: AxiosResponse
}

const DEFAULT_RETRY_ON_502_ATTEMPTS = 3
const sleep = async (ms: number) =>
  await new Promise(resolve => setTimeout(resolve, ms))

export const isAxiosErrorReq = (error: any): error is AxiosErrorReq =>
  error && error.request

export const isAxiosErrorResp = (error: any): error is AxiosErrorResp =>
  error && error.request && error.response

type COMMIT_STATUS_STATE = 'error' | 'pending' | 'success' | 'failure'

interface CommitStatusOptions {
  state: COMMIT_STATUS_STATE
  context: string
  description?: string
  target_url?: string
}

const getCommitDate = (commit: Commit) => {
  const committerDate = new Date(commit.committer.date)
  const authorDate = new Date(commit.author.date)
  return committerDate > authorDate ? committerDate : authorDate
}

export class GithubApi {
  private readonly ax = Axios.create({
    baseURL: 'https://api.github.com/',
    headers: {
      'User-Agent': 'spalger/kibana-pr-bot',
      Authorization: `token ${this.secret}`,
      Accept: 'application/vnd.github.shadow-cat-preview',
    },
  })

  private readonly throttledLogRateLimitInfo = throttle(
    (a: number, b: number) => this.logRateLimitInfo(a, b),
    10 * 1000,
  )

  public constructor(
    private readonly log: Log,
    private readonly secret: string,
  ) {}

  public async compare(
    headRef: string,
    baseRef: string,
  ): Promise<{
    totalMissingCommits: number
    missingCommits: GithubApiCompareCommit[]
  }> {
    const headComponent = encodeURIComponent(headRef)
    const baseComponent = encodeURIComponent(baseRef)
    const url = `/repos/elastic/kibana/compare/${headComponent}...${baseComponent}`

    const resp = await this.get<GithubApiCompare>(url)

    const { ahead_by: totalMissingCommits, commits: missingCommits } = resp.data

    if (totalMissingCommits > 0 && !missingCommits.length) {
      this.log.error(
        'unexpected github response, expected oldest missing commit',
        {
          totalMissingCommits,
          respBody: resp.data,
        },
      )

      throw new Error('Unexpected github response')
    }

    return {
      totalMissingCommits,
      missingCommits,
    }
  }

  public async getCommitDate(ref: string) {
    const refComponent = encodeURIComponent(ref)
    const resp = await this.get(`/repos/elastic/kibana/commits/${refComponent}`)
    return getCommitDate(resp.data.commit)
  }

  public async setCommitStatus(ref: string, options: CommitStatusOptions) {
    const shaComponent = encodeURIComponent(ref)
    const url = `/repos/elastic/kibana/statuses/${shaComponent}`
    await this.post(url, {}, options)
  }

  public async getCommitStatus(ref: string) {
    const shaComponent = encodeURIComponent(ref)
    const url = `/repos/elastic/kibana/commits/${shaComponent}/status`
    const resp = await this.get<CombinedCommitStatus>(url, {})
    return resp.data
  }

  public async getPr(prId: number) {
    const prIdComponent = encodeURIComponent(`${prId}`)
    const resp = await this.get<GithubApiPr>(
      `/repos/elastic/kibana/pulls/${prIdComponent}`,
    )
    return resp.data
  }

  public async getPrsAndFiles(
    commitSha: string,
    state: 'open' | 'closed' = 'open',
  ) {
    type ResponseType = {
      search: {
        nodes: Array<{
          __typename: 'PullRequest'
          number: number
          commits: {
            nodes: Array<{
              commit: {
                oid: string
              }
            }>
          }
          files: {
            nodes: Array<{
              path: string
            }>
            pageInfo: {
              hasNextPage: boolean
            }
          }
        }>
      }
    }

    const resp = await this.gql<ResponseType>(
      gql`
        query($query: String!) {
          search(first: 100, query: $query, type: ISSUE) {
            nodes {
              __typename
              ... on PullRequest {
                number
                commits(last: 1) {
                  nodes {
                    commit {
                      oid
                    }
                  }
                }
                files(first: 100) {
                  nodes {
                    path
                  }
                  pageInfo {
                    hasNextPage
                  }
                }
              }
            }
          }
        }
      `,
      {
        query: `${commitSha} state:${state}`,
      },
    )

    return resp.search.nodes.map(n => ({
      id: n.number,
      lastCommitSha: n.commits.nodes.map(nn => nn.commit.oid).shift(),
      hasMoreFiles: n.files.pageInfo.hasNextPage,
      files: n.files.nodes.map(nn => nn.path),
    }))
  }

  public async getPrFiles(prId: number) {
    const prIdComponent = encodeURIComponent(`${prId}`)
    const resp = await this.get<GithubApiPullRequestFiles>(
      `/repos/elastic/kibana/pulls/${prIdComponent}/files`,
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

  private async gql<T>(query: ASTNode, variables: Record<string, any>) {
    const resp = await this.ax.request<{ data: T }>({
      url: 'https://api.github.com/graphql',
      method: 'POST',
      headers: {
        Authorization: `bearer ${this.secret}`,
      },
      data: {
        query: print(query),
        variables,
      },
    })

    return resp.data.data
  }

  private async req<Result = any>(
    method: Method,
    url: string,
    params?: { [key: string]: any },
    body?: { [key: string]: any },
    retryOn502Attempts: number = DEFAULT_RETRY_ON_502_ATTEMPTS,
  ): Promise<AxiosResponse<Result>> {
    try {
      const resp = await this.ax({
        method,
        url,
        params,
        data: body,
      })

      this.checkForRateLimitInfo(resp)

      return resp
    } catch (error) {
      if (isAxiosErrorResp(error)) {
        this.checkForRateLimitInfo(error.response)
        this.log.debug('github api response error', {
          '@type': 'githubApiResponseError',
          status: error.response.status,
          data: {
            method,
            url,
            params,
            body,
            response: {
              headers: error.response.headers,
              body: error.response.data,
              status: error.response.status,
              statusText: error.response.statusText,
            },
          },
        })

        if (error.response.status === 502 && retryOn502Attempts > 0) {
          const attempt = DEFAULT_RETRY_ON_502_ATTEMPTS - retryOn502Attempts
          const delay = 2000 * attempt

          this.log.debug('automatically retrying request', {
            '@type': 'githubApi502Retry',
            status: error.response.status,
            delay,
            retryOn502Attempts,
            data: {
              method,
              url,
              params,
              body,
            },
          })

          await sleep(delay)
          return this.req<Result>(
            method,
            url,
            params,
            body,
            retryOn502Attempts - 1,
          )
        }
      } else if (isAxiosErrorReq(error)) {
        this.log.debug('github api request error', {
          '@type': 'githubApiRequestError',
          errorMessage: error.message,
          data: {
            method,
            url,
            params,
            body,
          },
        })
      }

      throw error
    }
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

  private async get<Result = any>(
    url: string,
    params?: { [key: string]: any },
  ) {
    return this.req<Result>('get', url, params)
  }

  private async post<Result = any>(
    url: string,
    params?: { [key: string]: any },
    body?: { [key: string]: any },
  ) {
    return this.req<Result>('post', url, params, body)
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
