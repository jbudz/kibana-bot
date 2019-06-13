import { GithubUserCompact, GithubUser, GithubOrg } from './user'
import { GithubRepo } from './repo'

interface GithubWebhookPushCommit {
  /** sha of the commit */
  id: string
  tree_id: string
  distinct: boolean
  message: string
  timestamp: string
  url: string
  author: GithubUserCompact
  committer: GithubUserCompact
  added: string[]
  removed: string[]
  modified: string[]
}

export interface GithubWebhookPushEvent {
  ref: string
  before: string
  after: string
  created: boolean
  deleted: boolean
  forced: boolean
  base_ref: string | null
  compare: string
  commits: GithubWebhookPushCommit[]
  head_commit: GithubWebhookPushCommit
  repository: GithubRepo
  pusher: GithubUser
  organization: GithubOrg
  sender: GithubUser
}
