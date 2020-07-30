import { GithubRepo } from './repo'
import { GithubUser, GithubOrg } from './user'

export interface GithubApiLabel {
  id: number
  node_id: string
  url: string
  name: string
  /** hex code without # */
  color: string
  default: boolean
  description: string
}

export type GithubWebhookLabelEvent = {
  action: 'created' | 'edited' | 'deleted'
  label: GithubApiLabel
  repository: GithubRepo
  organization: GithubOrg
  sender: GithubUser
}
