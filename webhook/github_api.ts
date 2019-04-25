import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'

interface AxiosErrorResp extends AxiosError {
  request: any
  response: AxiosResponse
}

interface ApiCommit {
  author: {
    name: string
    email: string
    date: string
  }
  committer: {
    name: string
    email: string
    date: string
  }
  message: string
  tree: {
    sha: string
    url: string
  }
  url: string
  comment_count: number
  verification?: {
    verified: boolean
    reason: string
    signature: string
    payload: string
  }
}

const isAxiosErrorResp = (error: any): error is AxiosErrorResp =>
  error && error.request && error.response

const getCommitDate = (commit: ApiCommit) => {
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
      },
    })
  }

  public async compare(headRef: string, baseRef: string) {
    const headComponent = encodeURIComponent(headRef)
    const baseComponent = encodeURIComponent(baseRef)
    const url = `/repos/elastic/kibana/compare/${headComponent}...${baseComponent}`

    try {
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
    } catch (error) {
      if (isAxiosErrorResp(error)) {
        console.log(
          'GITHUB API ERROR RESPONSE:\n  url: %s\n  status: %s\n  data: %j',
          url,
          `${error.response.status} - ${error.response.statusText}`,
          error.response.data,
        )
      }

      throw error
    }
  }

  public async getCommitDate(ref: string) {
    const refComponent = encodeURIComponent(ref)
    const resp = await this.ax.get(
      `/repos/elastic/kibana/commits/${refComponent}`,
    )
    return getCommitDate(resp.data.commit)
  }
}
