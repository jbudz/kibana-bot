import { outdated } from './outdated'
import { releaseNoteLabels } from './release_note_labels'
import { releaseVersionLabels } from './release_version_labels'
import { ciNotRequired } from './ci_not_required'
import { badCommits } from './bad_commits'
import { backportReminder } from './backport_reminder'
import { communityPr } from './community_pr'
import { addLabelReactor } from './add_label_reactor'
import { missingLabelReactor } from './missing_label_reactor'

export const prReactors = [
  outdated,
  releaseNoteLabels,
  releaseVersionLabels,
  ciNotRequired,
  badCommits,
  backportReminder,
  communityPr,
  addLabelReactor,
  missingLabelReactor,
]
