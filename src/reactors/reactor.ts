import { Client } from '@elastic/elasticsearch'

import { SlackApi, GithubApi, Log } from '../lib'

export interface ReactorContext<I> {
  input: I
  log: Log
  githubApi: GithubApi
  es: Client
  slackApi: SlackApi
}

export class Reactor<I> {
  public readonly id: string
  public readonly filter: (context: ReactorContext<I>) => boolean
  public readonly exec: (context: ReactorContext<I>) => Promise<any>

  public constructor(options: {
    id: Reactor<I>['id']
    filter: Reactor<I>['filter']
    exec: Reactor<I>['exec']
  }) {
    this.id = options.id
    this.filter = options.filter
    this.exec = options.exec
  }
}
