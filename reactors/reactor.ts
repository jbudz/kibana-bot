import { GithubApi, GithubApiPr, Log } from '../lib'

export interface ReactorContext {
  log: Log
  githubApi: GithubApi
  action: string
}

export class Reactor<C extends ReactorContext> {
  public readonly id: string
  public readonly filter: (context: C) => boolean
  public readonly exec: (context: C) => Promise<any>

  public constructor(options: {
    id: Reactor<C>['id']
    filter: Reactor<C>['filter']
    exec: Reactor<C>['exec']
  }) {
    this.id = options.id
    this.filter = options.filter
    this.exec = options.exec
  }
}
