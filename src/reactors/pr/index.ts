import { outdated } from './outdated'
import { releaseNoteLabels } from './release_note_labels'
import { ensureCi } from './ensure_ci'

export const prReactors = [outdated, releaseNoteLabels, ensureCi]
