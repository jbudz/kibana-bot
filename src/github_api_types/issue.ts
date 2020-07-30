import { GithubUser } from './user'
import { GithubRepo } from './repo'
import { GithubApiLabel } from './label'
import { GithubAuthorAssociation } from './author_association'

export interface GithubWebhookIssueEvent {
  action:
    | 'opened'
    | 'edited'
    | 'deleted'
    | 'pinned'
    | 'unpinned'
    | 'closed'
    | 'reopened'
    | 'assigned'
    | 'unassigned'
    | 'labeled'
    | 'unlabeled'
    | 'locked'
    | 'unlocked'
    | 'transferred'
    | 'milestoned'
    | 'demilestoned'
  issue: GithubApiIssue
  /** The changes to the issue if the action was edited. */
  changes?: {
    title?: {
      /** The previous version of the title if the action was edited. */
      from?: string
    }
    body?: {
      /** The previous version of the body if the action was edited. */
      from?: string
    }
  }
  /** The optional user who was assigned or unassigned from the issue. */
  assignee?: GithubUser
  /** The optional label that was added or removed from the issue. */
  label?: GithubApiLabel
  repository: GithubRepo
  sender: unknown
}

export interface GithubApiIssue {
  url: string
  repository_url: string
  labels_url: string
  comments_url: string
  events_url: string
  html_url: string
  id: number
  node_id: string
  number: number
  title: string
  user: GithubUser
  labels: GithubApiLabel[]
  state: 'open' | 'closed'
  locked: false
  assignee: GithubUser
  assignees: GithubUser[]
  milestone: unknown
  comments: number
  /** ISO8601 date-time string */
  created_at: string
  /** ISO8601 date-time string */
  updated_at: string
  /** optional ISO8601 date-time string */
  closed_at?: string
  /**
   * MEMBER: Author is a member of the organization that owns the repository.
   * OWNER: Author is the owner of the repository.
   * COLLABORATOR: Author has been invited to collaborate on the repository.
   * CONTRIBUTOR: Author has previously committed to the repository.
   * FIRST_TIME_CONTRIBUTOR: Author has not previously committed to the repository.
   * FIRST_TIMER: Author has not previously committed to GitHub.
   * NONE: Author has no association with the repository.
   */
  author_association: GithubAuthorAssociation
  body: string
}
