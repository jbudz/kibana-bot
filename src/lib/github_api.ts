import Axios, { AxiosResponse, Method } from 'axios'
import parseLinkHeader from 'parse-link-header'
import { getConfigVar } from '@spalger/micro-plus'
import gql from 'graphql-tag'
import { print } from 'graphql/language/printer'
import { ASTNode } from 'graphql/language/ast'

import {
  GithubApiPr,
  GithubApiLabel,
  GithubApiIssue,
  GithubApiCompare,
  Commit,
  GithubApiCompareCommit,
  CombinedCommitStatus,
  GithubApiPullRequestFiles,
} from '../github_api_types'
import { makeContextCache } from './req_cache'
import { Log, getRequestLogger } from './log'
import { isObj } from './type_helpers'
import {
  isAxiosErrorReq,
  isAxiosErrorResp,
  AxiosErrorResp,
} from './axios_errors'

const RATE_LIMIT_THROTTLE_MS = 10 * 1000
const MAX_REQ_ATTEMPTS = 3
const sleep = async (ms: number) =>
  await new Promise(resolve => setTimeout(resolve, ms))

type COMMIT_STATUS_STATE = 'error' | 'pending' | 'success' | 'failure'

interface CommitStatusOptions {
  state: COMMIT_STATUS_STATE
  context: string
  description?: string
  target_url?: string
}

type RetryOptions = {
  attempt?: number
  forceRetries?: boolean
}

export type FileReq = {
  id: number
  filesEndCursor: string
  files?: string[]
}
export type OutdatedPr = {
  id: number
  updatedSinceCommit: true
  files?: undefined
}
export type PrWithFiles = {
  id: number
  updatedSinceCommit: false
  files: string[]
}

interface GqlErrorResponse {
  type: string
  path: string[]
  locations: unknown
  message: string
}
interface GqlRespError extends Error {
  resp: {
    data: unknown
    errors: GqlErrorResponse[]
  }
}

export function isGqlRespError(error: any): error is GqlRespError {
  return (
    isObj(error) &&
    isObj(error.resp) &&
    Array.isArray(error.resp.errors) &&
    error.resp.errors.every(isObj)
  )
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

  public constructor(
    private readonly log: Log,
    private readonly secret: string,
    private readonly dryRun: boolean = false,
  ) {}

  public async getMissingCommits(
    refToStartFrom: string,
    refWithNewCommits: string,
  ): Promise<{
    totalMissingCommits: number
    missingCommits: GithubApiCompareCommit[]
  }> {
    const startComponent = encodeURIComponent(refToStartFrom)
    const newCommitsComponent = encodeURIComponent(refWithNewCommits)
    const url = `/repos/elastic/kibana/compare/${startComponent}...${newCommitsComponent}`

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
    if (this.dryRun) {
      const status = await this.getCommitStatus(ref)
      this.log.info(`Dry Run: change from ${status.state} to ${options.state}`)
      this.log.info(`Dry Run: ${options.context}`)
      this.log.info(`Dry Run: ${options.description}`)
      return
    }

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

  public async getPr(prId: number, options?: { forceRetries?: boolean }) {
    const prIdComponent = encodeURIComponent(`${prId}`)
    const resp = await this.get<GithubApiPr>(
      `/repos/elastic/kibana/pulls/${prIdComponent}`,
      undefined,
      {
        forceRetries: options?.forceRetries,
      },
    )
    return resp.data
  }

  public async getIssue(issueId: number) {
    const issueIdComponent = encodeURIComponent(`${issueId}`)
    const resp = await this.get<GithubApiIssue>(
      `/repos/elastic/kibana/issues/${issueIdComponent}`,
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
              endCursor: string
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
                    endCursor
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

    const restOfFilesReqs: FileReq[] = []
    const prs: Array<OutdatedPr | PrWithFiles> = []

    for (const n of resp.search.nodes) {
      const lastSha = n.commits.nodes.map(nn => nn.commit.oid).shift()
      if (lastSha !== commitSha) {
        prs.push({
          id: n.number,
          updatedSinceCommit: true,
        })
        continue
      }

      prs.push({
        id: n.number,
        updatedSinceCommit: false,
        // placeholder, will be replaced once rest of files are fetched
        files: [],
      })
      restOfFilesReqs.push({
        id: n.number,
        files: n.files.nodes.map(nn => nn.path),
        filesEndCursor: n.files.pageInfo.endCursor,
      })
    }

    const allFiles = await this.getRestOfFiles(restOfFilesReqs)
    return prs.map(pr => {
      const files = allFiles.get(pr.id)
      return files ? ({ ...pr, files } as PrWithFiles) : (pr as OutdatedPr)
    })
  }

  public async getRestOfFiles(reqs: FileReq[]): Promise<Map<number, string[]>> {
    // array of requests that will be fetched, on each fetch the array is cleared and reloaded with info to fetch the subsequent pages
    const nextReqs = reqs.slice()

    // map of all files for the requested pr ids
    const allFiles = new Map(reqs.map(r => [r.id, r.files || []]))

    while (nextReqs.length) {
      const batch = nextReqs.splice(0)

      type RepsonseType = {
        repository: {
          [prKey: string]: {
            number: number
            files: {
              nodes: Array<{
                path: string
              }>
              pageInfo: {
                endCursor: string
                hasNextPage: boolean
              }
            }
          }
        }
      }

      let queries = ''
      const vars: Array<{
        name: string
        type: string
        value: string | number
      }> = []
      for (const [i, { id, filesEndCursor }] of batch.entries()) {
        queries = `${queries}
          req${i}: pullRequest(number: $num${i}) {
            number
            files(first: 100, after: $after${i}) {
              nodes {
                path
              }
              pageInfo {
                endCursor
                hasNextPage
              }
            }
          }
        `
        vars.push(
          {
            name: `num${i}`,
            type: 'Int!',
            value: id,
          },
          {
            name: `after${i}`,
            type: 'String!',
            value: filesEndCursor,
          },
        )
      }

      const args = vars.map(v => `$${v.name}: ${v.type}`)
      const moreFilesResp = await this.gql<RepsonseType>(
        gql`query(${args.join(',')}) {
          repository(owner: "elastic", name: "kibana") {${queries}}
        }`,
        Object.fromEntries(vars.map(v => [v.name, v.value])),
      )

      for (const resp of Object.values(moreFilesResp.repository)) {
        allFiles.set(resp.number, [
          ...(allFiles.get(resp.number) || []),
          ...resp.files.nodes.map(n => n.path),
        ])

        if (resp.files.pageInfo.hasNextPage) {
          nextReqs.push({
            id: resp.number,
            filesEndCursor: resp.files.pageInfo.endCursor,
          })
        }
      }
    }

    return allFiles
  }

  public async getPrFiles(prId: number) {
    const prIdComponent = encodeURIComponent(`${prId}`)
    const resp = await this.get<GithubApiPullRequestFiles>(
      `/repos/elastic/kibana/pulls/${prIdComponent}/files`,
    )
    return resp.data
  }

  public ittrAllOpenPrs() {
    return this.ittrAll<GithubApiPr>(async () => {
      this.log.info('fetching initial page of PRs')
      return await this.get<GithubApiPr[]>('/repos/elastic/kibana/pulls', {
        state: 'open',
      })
    })
  }

  public ittrAllOpenIssues() {
    return this.ittrAll<GithubApiIssue>(async () => {
      this.log.info('fetching initial page of issues')
      return await this.get<GithubApiIssue[]>('/repos/elastic/kibana/issues', {
        state: 'open',
      })
    })
  }

  public iterAllLabels() {
    return this.ittrAll<GithubApiLabel>(async () => {
      this.log.info('fetching initial page of labels')
      return await this.get<GithubApiLabel[]>(
        '/repos/elastic/kibana/labels',
        {},
      )
    })
  }

  private async *ittrAll<T>(
    fetchInitialPage: () => Promise<AxiosResponse<T[]>>,
  ) {
    const urls: (string | null)[] = [null]

    const fetchNextPage = async (url: string) => {
      console.log('fetching next page', url)
      return await this.get<T[]>(url)
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

  public async gql<T extends object>(
    query: ASTNode,
    variables: Record<string, any>,
  ) {
    const resp = await this.ax.request<{
      data: T
      errors?: GqlErrorResponse[]
    }>({
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

    if (resp.data.errors) {
      const error: Partial<GqlRespError> = new Error(
        `Graphql Errors: ${JSON.stringify(resp.data.errors)}`,
      )
      error.resp = {
        data: resp.data.data,
        errors: resp.data.errors,
      }
      throw error as GqlRespError
    }

    this.checkForGqlRateLimitInfo(resp.data.data)

    return resp.data.data
  }

  public async getBackportState(prId: number) {
    type PrRef = {
      __typename: 'PullRequest'
      /** title of the referenced PR */
      title: string
      /** The possible states of a pull request. */
      state: 'OPEN' | 'CLOSED' | 'MERGED'
      /** Identifies the name of the base Ref associated with the pull request, even if the ref has been deleted. */
      baseRefName: string
      commits: {
        edges: Array<{
          node: {
            /** The Git commit object */
            commit: {
              /** The Git commit message */
              message: string
            }
          }
        }>
      }
    }

    interface PendingOrOpenPrRef extends PrRef {
      state: Exclude<PrRef['state'], 'CLOSED'>
    }

    type OtherRef = {
      __typename: unknown
    }

    type RepsonseType = {
      repository?: {
        /** Returns a single pull request from the current repository by number. */
        pullRequest?: {
          /** The commit that was created when this pull request was merged. */
          mergeCommit?: {
            /** The Git commit message */
            message: string
          }

          labels?: {
            nodes?: Array<{
              name: string
            }>
          }

          /** A list of events, comments, commits, etc. associated with the pull request. */
          timelineItems: {
            edges: Array<
              | {
                  node?: {
                    source?: PrRef | OtherRef
                  }
                }
              | undefined
              | null
            >
          }
        }
      }
    }

    const resp = await this.gql<RepsonseType>(
      gql`
        query($prId: Int!) {
          repository(owner: "elastic", name: "kibana") {
            pullRequest(number: $prId) {
              mergeCommit {
                message
              }

              labels(first: 100) {
                nodes {
                  name
                }
              }

              timelineItems(last: 20, itemTypes: CROSS_REFERENCED_EVENT) {
                edges {
                  node {
                    ... on CrossReferencedEvent {
                      source {
                        __typename
                        ... on PullRequest {
                          title
                          state
                          baseRefName
                          commits(first: 20) {
                            edges {
                              node {
                                commit {
                                  message
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
      {
        prId,
      },
    )

    const pr = resp.repository?.pullRequest
    if (!pr) {
      throw new Error(`unable to find PR #${prId}`)
    }

    if (!pr.mergeCommit) {
      throw new Error(`pr #${prId} not merged`)
    }

    const getFirstLine = (str: string) => str.split('\n')[0]
    const firstLineOfMergeCommit = getFirstLine(pr.mergeCommit.message)
    const isRefToBackportPr = (prRef: PrRef) => {
      const includesUneditedMergeCommit = prRef.commits.edges.some(
        commit =>
          getFirstLine(commit.node.commit.message) === firstLineOfMergeCommit,
      )

      const matchesPrTitle =
        prRef.title.includes(firstLineOfMergeCommit) &&
        prRef.title.includes(`${prId}`)

      return includesUneditedMergeCommit || matchesPrTitle
    }

    return {
      labels: pr.labels?.nodes?.map(n => n.name) ?? [],
      backportPrs: pr.timelineItems.edges
        .map(edge => edge?.node?.source)
        .filter((ref): ref is PrRef => ref?.__typename === 'PullRequest')
        .filter(
          (prRef): prRef is PendingOrOpenPrRef =>
            (prRef.state === 'MERGED' || prRef.state === 'OPEN') &&
            isRefToBackportPr(prRef),
        )
        .map(prRef => ({
          branch: prRef.baseRefName,
          state: prRef.state,
        })),
    }
  }

  public async setPrLabels(prId: number, labels: string[]) {
    if (this.dryRun) {
      const pr = await this.getPr(prId)
      const prLabels = pr.labels.map(label => label.name)
      this.log.info(`Dry Run: labels before ${prLabels}`)
      this.log.info(`Dry Run: labels after ${labels} `)
      return pr.labels
    }

    return await this.commitLabels(prId, labels)
  }

  public async setIssueLabels(issueId: number, labels: string[]) {
    if (this.dryRun) {
      const issue = await this.getIssue(issueId)
      const issueLabels = issue.labels.map(label => label.name)
      this.log.info(`Dry Run: labels before ${issueLabels}`)
      this.log.info(`Dry Run: labels after ${labels} `)
      return issue.labels
    }

    return await this.commitLabels(issueId, labels)
  }

  private async commitLabels(itemId: number, labels: string[]) {
    const resp = await this.post<GithubApiIssue>(
      this.issuesUrl(itemId),
      {},
      {
        labels,
      },
    )

    return resp.data.labels
  }

  public async addCommentToPr(prId: number, commentBody: string) {
    if (this.dryRun) {
      const pr = await this.getPr(prId)
      this.log.info(`Dry Run: add comment to ${pr.number}: ${pr.title}`)
      this.log.info(`Dry Run: comment is "${commentBody}"`)
      return
    }

    const url = `${this.issuesUrl(prId)}/comments`
    await this.post<unknown>(
      url,
      {},
      {
        body: commentBody,
      },
    )
  }

  private shouldRetry(
    error: AxiosErrorResp,
    url: string,
    method: Method,
    attempt: number,
  ) {
    if (attempt >= MAX_REQ_ATTEMPTS) {
      return false
    }

    if (error.response.status === 502) {
      return true
    }

    if (
      method.toLocaleLowerCase() === 'post' &&
      error.response.status === 422 &&
      error.response.data?.message?.startsWith('No commit found for SHA:')
    ) {
      return true
    }

    if (
      method.toLocaleLowerCase() === 'get' &&
      url.includes('/compare/') &&
      error.response.status === 404
    ) {
      return true
    }

    return false
  }

  private issuesUrl(id: number) {
    const idComponent = encodeURIComponent(id)
    return `/repos/elastic/kibana/issues/${idComponent}`
  }

  private async req<Result = any>(
    options: {
      method: Method
      url: string
      params?: { [key: string]: any }
      body?: { [key: string]: any }
    } & RetryOptions,
  ): Promise<AxiosResponse<Result>> {
    const {
      method,
      url,
      params,
      body,
      attempt = 1,
      forceRetries = false,
    } = options

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
          extra: {
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

        if (forceRetries || this.shouldRetry(error, url, method, attempt)) {
          const delay = 2000 * attempt

          this.log.debug('automatically retrying request', {
            '@type': 'githubApiAutoRetry',
            status: error.response.status,
            delay,
            attempt,
            extra: {
              method,
              url,
              params,
              body,
              resp: {
                status: error.response.status,
                statusText: error.response.statusText,
                headers: error.response.headers,
                body: error.response.data,
              },
            },
          })

          await sleep(delay)
          return this.req<Result>({
            ...options,
            attempt: attempt + 1,
          })
        }
      } else if (isAxiosErrorReq(error)) {
        this.log.debug('github api request error', {
          '@type': 'githubApiRequestError',
          errorMessage: error.message,
          extra: {
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
      this.logRateLimitInfo(
        Number.parseFloat(resp.headers['x-ratelimit-remaining']),
        Number.parseFloat(resp.headers['x-ratelimit-limit']),
      )
    }
  }

  private checkForGqlRateLimitInfo(resp: {
    rateLimit?: {
      limit?: number
      remaining?: number
    }
  }) {
    if (
      resp.rateLimit &&
      resp.rateLimit.limit !== undefined &&
      resp.rateLimit.remaining !== undefined
    ) {
      this.logRateLimitInfo(resp.rateLimit.remaining, resp.rateLimit.limit)
    }
  }

  private async get<Result = any>(
    url: string,
    params?: { [key: string]: any },
    options?: RetryOptions,
  ) {
    return this.req<Result>({ ...options, method: 'get', url, params })
  }

  private async post<Result = any>(
    url: string,
    params?: { [key: string]: any },
    body?: { [key: string]: any },
    options?: RetryOptions,
  ) {
    return this.req<Result>({ ...options, method: 'post', url, params, body })
  }

  private rateLimitLogThrottled?: {
    timer: NodeJS.Timer
    nextArgs?: [number, number]
  }

  private logRateLimitInfo(remaining: number, total: number) {
    if (this.rateLimitLogThrottled) {
      this.rateLimitLogThrottled.nextArgs = [remaining, total]
      return
    }

    this.rateLimitLogThrottled = {
      timer: setTimeout(() => {
        const { nextArgs } = this.rateLimitLogThrottled!
        this.rateLimitLogThrottled = undefined

        if (nextArgs) {
          this.logRateLimitInfo(...nextArgs)
        }
      }, RATE_LIMIT_THROTTLE_MS),
    }

    // don't keep the process open just to log rate limit
    this.rateLimitLogThrottled.timer.unref()

    this.log.info(`rate limit ${remaining}/${total}`, {
      '@type': 'githubRateLimit',
      rateLimitRemaining: remaining,
      rateLimitTotal: total,
    })
  }
}

const githubApiCache = makeContextCache('github api', ctx => {
  return new GithubApi(getRequestLogger(ctx), getConfigVar('GITHUB_SECRET'))
})

export const getGithubApi = githubApiCache.get
export const assignGithubApi = githubApiCache.assignValue
