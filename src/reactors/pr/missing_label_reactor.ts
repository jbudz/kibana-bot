import { LabelTransform } from '../'
import { RELEASE_BRANCH_RE, InvalidLabelLog } from '../../lib'
import { prMissingLabelTransforms as presentationTeamTransforms } from '../../teams/presentation_team'
import { ReactorInput, PrReactor } from './pr_reactor'

/**
 * Teams and other interested parties should add their label transform functions to this
 * list.
 *
 * ORDER MATTERS.
 *
 * The functions are run in order-- left-to-right-- thus transforming the result of the previous
 * transform.
 */
const labelTransforms: LabelTransform[] = [...presentationTeamTransforms]

const RELEVANT_ACTIONS_MISSING_LABEL: ReactorInput['action'][] = [
  'labeled',
  'unlabeled',
  'opened',
  'synchronize',
  'refresh',
  'ready_for_review',
]

export const missingLabelReactor = new PrReactor({
  id: 'prMissingLabelReactor',

  filter: ({ input: { action, pr } }) =>
    pr.state === 'open' &&
    !pr.draft &&
    RELEVANT_ACTIONS_MISSING_LABEL.includes(action),

  async exec({ input: { pr, action }, githubApi, es, log }) {
    log.info(`issue #${pr.number} [action=${action}]`, { action })
    const labelNames = pr.labels.map(label => label.name)
    let labels = [...labelNames]

    labelTransforms.forEach(check => {
      labels = check(labels)
    })

    const diff = labels.filter(label => !labelNames.includes(label))

    // we must check these in exec() since they can change over time so we don't want
    // to orphan a PR that became a backport PR or was retargetted away from master
    const isBasedOnReleaseBranch = RELEASE_BRANCH_RE.test(pr.base.ref)
    const isBackport = labelNames.includes('backport')

    if (isBasedOnReleaseBranch && diff.length > 0 && !isBackport) {
      await new InvalidLabelLog(es, log).add(pr.number)
      await githubApi.setCommitStatus(pr.head.sha, {
        context: 'prbot:required labels',
        description: `${
          diff.length > 1 ? 'Several labels are' : 'Label is '
        } missing: ${diff.join(', ')}`,
        state: 'failure',
      })
    } else {
      await githubApi.setCommitStatus(pr.head.sha, {
        context: 'prbot:required labels',
        state: 'success',
      })
    }

    return {
      pr: pr.number,
      prTitle: pr.title,
      labelNames,
      diff,
      isBasedOnReleaseBranch,
      isBackport,
    }
  },
})
