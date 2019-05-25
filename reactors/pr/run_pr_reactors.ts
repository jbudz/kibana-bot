import { PrReactorContext } from './pr_reactor'
import { runReactors, RunReactorOptions } from '../run_reactors'

import { outdated } from './outdated'
import { releaseNoteLabels } from './release_note_labels'

const reactors = [outdated, releaseNoteLabels]

export async function runPrReactors(
  options: RunReactorOptions<PrReactorContext>,
) {
  return await runReactors(reactors, options)
}
