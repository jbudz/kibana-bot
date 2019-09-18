import { GithubRepo } from './repo'
import { GithubUser } from './user'

export type StatusState = 'error' | 'failure' | 'pending' | 'success'
export type GQLStatusState = 'ERROR' | 'FAILURE' | 'PENDING' | 'SUCCESS'

export interface CombinedCommitStatus {
  state: StatusState
  statuses: {
    url: unknown
    avatar_url: unknown
    id: number
    node_id: unknown
    state: StatusState
    description: string
    target_url: unknown
    context: string
    created_at: unknown
    updated_at: unknown
  }[]
  sha: unknown
  total_count: unknown
  repository: unknown
  commit_url: unknown
  url: unknown
}

export interface GithubWebhookCommitStatus {
  id: number
  sha: string
  name: unknown
  target_url: unknown
  context: string
  description: unknown
  state: StatusState
  commit: {
    sha: string
    node_id: unknown
    commit: {
      author: unknown
      committer: unknown
      message: unknown
      tree: {
        sha: unknown
        url: unknown
      }
      url: unknown
      comment_count: unknown
      verification: unknown
    }
    url: unknown
    html_url: unknown
    comments_url: unknown
    author: GithubUser
    committer: GithubUser
    parents: unknown[]
  }
  branches: Array<{
    name: string
    commit: {
      sha: string
      url: string
    }
    protected: boolean
  }>
  created_at: unknown
  updated_at: unknown
  repository: GithubRepo
  sender: GithubUser
}
