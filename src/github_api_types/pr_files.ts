type FileStatus = 'modified' | 'added' | 'renamed' | 'removed'

export interface GithubApiPullRequestFile {
  sha: string
  filename: string
  previous_filename?: string
  status: FileStatus
  additions: number
  deletions: number
  changes: number
  blob_url: string
  raw_url: string
  contents_url: string
  patch: string
}

export type GithubApiPullRequestFiles = GithubApiPullRequestFile[]
