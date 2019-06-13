import { GithubUser } from './user'

interface CommitUser {
  name: string
  email: string
  date: string
}

interface CommitRefTiny {
  url: string
  sha: string
}

export interface Commit {
  url: unknown
  author: CommitUser
  committer: CommitUser
  message: string
  tree: CommitRefTiny
  comment_count: number
  verification: unknown
}

export interface GithubApiCompareCommit {
  url: unknown
  sha: string
  node_id: string
  html_url: unknown
  comments_url: unknown
  commit: Commit
  author: GithubUser
  committer: GithubUser
  parents: CommitRefTiny[]
}

interface File {
  sha: string
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
  blob_url: unknown
  raw_url: unknown
  contents_url: unknown
  patch: string
}

export interface GithubApiCompare {
  url: unknown
  html_url: unknown
  permalink_url: unknown
  diff_url: unknown
  patch_url: unknown
  base_commit: GithubApiCompareCommit
  merge_base_commit: GithubApiCompareCommit
  status: string
  ahead_by: number
  behind_by: number
  total_commits: number
  commits: GithubApiCompareCommit[]
  files: File[]
}
