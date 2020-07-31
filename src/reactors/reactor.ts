import { Client } from '@elastic/elasticsearch'

import { GithubApi, Logger, Config } from '../lib'

export interface ReactorContext {
  log: Logger
  githubApi: GithubApi
  es: Client
  config: Config
}

export class Reactor<I> {
  public readonly id: string
  public readonly filter: (context: ReactorContext & { input: I }) => boolean
  public readonly exec: (context: ReactorContext & { input: I }) => Promise<any>

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
