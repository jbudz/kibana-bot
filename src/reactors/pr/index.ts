import { outdated } from './outdated'
import { releaseNoteLabels } from './release_note_labels'
import { releaseVersionLabels } from './release_version_labels'
import { docsOnlyChangeCi } from './docs_only_change_ci'
import { badCommits } from './bad_commits'

export const prReactors = [
  outdated,
  releaseNoteLabels,
  releaseVersionLabels,
  docsOnlyChangeCi,
  badCommits,
]
