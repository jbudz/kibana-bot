import { Reactor } from '../reactor'
import { GithubWebhookPullRequestEvent } from '../../github_api_types'

export interface ReactorInput {
  action: GithubWebhookPullRequestEvent['action'] | 'refresh'
  pr: GithubWebhookPullRequestEvent['pull_request']
  prFromApi: boolean
}

export class PrReactor extends Reactor<ReactorInput> {}
