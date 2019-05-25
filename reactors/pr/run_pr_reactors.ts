import { outdated } from './outdated'
import { PrReactorContext } from './pr_reactor'
import { runReactors } from '../run_reactors'

export async function runPrReactors(options: {
  force?: boolean
  context: PrReactorContext
}) {
  return await runReactors([outdated], options)
}
