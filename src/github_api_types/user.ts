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
  name: string
  email: string
  login: string
  id: number
  node_id: string
  avatar_url: string
  gravatar_id: string
  url: string
  html_url: string
  followers_url: string
  following_url: string
  gists_url: string
  starred_url: string
  subscriptions_url: string
  organizations_url: string
  repos_url: string
  events_url: string
  received_events_url: string
  type: 'Bot' | 'User'
  site_admin: boolean
}
