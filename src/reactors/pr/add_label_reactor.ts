import { LabelTransform, performLabelTransform } from '../'
import { RELEASE_BRANCH_RE } from '../../lib'
import { prAddLabelTransforms as presentationTeamTransforms } from '../../teams/presentation_team'
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

export const addLabelReactor = new PrReactor({
  id: 'prAddLabelReactor',

  filter: ({ input: { action, pr } }) =>
    pr.state === 'open' &&
    !pr.draft &&
    RELEVANT_ACTIONS_MISSING_LABEL.includes(action),

  async exec({ input: { pr, action }, githubApi, log }) {
    log.info(`pr #${pr.number} [action=${action}]`, { action })

    const existingLabels = pr.labels.map(label => label.name)
    const transformedLabels = performLabelTransform(
      existingLabels,
      labelTransforms,
    )

    // we must check these in exec() since they can change over time so we don't want
    // to orphan a PR that became a backport PR or was retargetted away from master
    const isBasedOnReleaseBranch = RELEASE_BRANCH_RE.test(pr.base.ref)
    const isBackport = existingLabels.includes('backport')

    if (transformedLabels && isBasedOnReleaseBranch && !isBackport) {
      await githubApi.setPrLabels(pr.number, transformedLabels)
    }

    return {
      pr: pr.number,
      prTitle: pr.title,
      existingLabels,
      transformedLabels,
      isBasedOnReleaseBranch,
      isBackport,
    }
  },
})
