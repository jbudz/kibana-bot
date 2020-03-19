import { Reactor } from '../reactor'
import { GithubWebhookIssueEvent } from '../../github_api_types'

export interface IssueReactorInput {
  action: GithubWebhookIssueEvent['action'] | 'refresh'
  issue: GithubWebhookIssueEvent['issue']
}

export class IssueReactor extends Reactor<IssueReactorInput> {}
