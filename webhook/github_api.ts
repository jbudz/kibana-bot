import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import parseLinkHeader from 'parse-link-header'

import { GithubApiPr, GithubApiCommit } from './github_api_types'

interface AxiosErrorResp extends AxiosError {
  request: any
  response: AxiosResponse
}

export const isAxiosErrorResp = (error: any): error is AxiosErrorResp =>
  error && error.request && error.response

const getCommitDate = (commit: GithubApiCommit) => {
  const committerDate = new Date(commit.committer.date)
  const authorDate = new Date(commit.author.date)
  return committerDate > authorDate ? committerDate : authorDate
}

export class GithubApi {
  private readonly ax: AxiosInstance

  public constructor(secret: string) {
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

    const resp = await this.ax.get(url)

    const {
      ahead_by: missingCommits,
      commits: [oldestMissingCommit],
    } = resp.data

    if (missingCommits > 0 && !oldestMissingCommit) {
      console.log(
        'UNEXPECTED GITHUB RESPONSE: expected oldest missing commit\n  missingCommits: %d\n resp: %j',
        missingCommits,
        resp.data,
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
    const resp = await this.ax.get(
      `/repos/elastic/kibana/commits/${refComponent}`,
    )
    return getCommitDate(resp.data.commit)
  }

  public async *ittrAllOpenPrs() {
    const urls: (string | null)[] = [null]

    const fetchInitialPage = async () => {
      console.log('fetching initial page of PRs')
      return await this.ax.get<GithubApiPr[]>('/repos/elastic/kibana/pulls', {
        params: {
          state: 'open',
        },
      })
    }

    const fetchNextPage = async (url: string) => {
      console.log('fetching page of PRs', url)
      return await this.ax.get<GithubApiPr[]>(url)
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
}
