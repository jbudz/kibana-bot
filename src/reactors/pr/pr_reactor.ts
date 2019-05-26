import { GithubApiPr } from '../../lib'
import { ReactorContext, Reactor } from '../reactor'

export interface PrReactorContext extends ReactorContext {
  pr: GithubApiPr
}

export class PrReactor extends Reactor<PrReactorContext> {}
