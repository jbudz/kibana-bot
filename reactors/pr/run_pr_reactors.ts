import { PrReactorContext } from './pr_reactor'
import { runReactors } from '../run_reactors'

import { outdated } from './outdated'
import { releaseNoteLabels } from './release_note_labels'

const reactors = [outdated, releaseNoteLabels]

export async function runPrReactors(options: {
  force?: boolean
  context: PrReactorContext
}) {
  return await runReactors(reactors, options)
}
