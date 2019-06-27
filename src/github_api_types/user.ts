export type GithubUserCompact = GithubUserBotCompact | GithubUserHumanCompact

interface GithubUserHumanCompact {
  name: string
  email: string
  username: string
}

interface GithubUserBotCompact {
  name: string
  email: string | null
}

export interface GithubOrg {
  login: string
  id: number
  node_id: string
  url: string
  repos_url: string
  events_url: string
  hooks_url: string
  issues_url: string
  members_url: string
  public_members_url: string
  avatar_url: string
  description: string
}
export interface GithubUser {
  name: unknown
  email: unknown
  login: string
  id: number
  node_id: unknown
  avatar_url: unknown
  gravatar_id: unknown
  url: unknown
  html_url: unknown
  followers_url: unknown
  following_url: unknown
  gists_url: unknown
  starred_url: unknown
  subscriptions_url: unknown
  organizations_url: unknown
  repos_url: unknown
  events_url: unknown
  received_events_url: unknown
  type: 'Bot' | 'User'
  site_admin: boolean
}
