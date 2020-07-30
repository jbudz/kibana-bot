import { Reactor } from '../reactor'
import { GithubWebhookLabelEvent } from '../../github_api_types'

export interface ReactorInput {
  action: GithubWebhookLabelEvent['action'] | 'refresh'
  label: GithubWebhookLabelEvent['label']
}

export class LabelReactor extends Reactor<ReactorInput> {}
