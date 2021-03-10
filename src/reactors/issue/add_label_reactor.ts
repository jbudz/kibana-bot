import { issueLabelTransforms as presentationTeamTransforms } from '../../teams/presentation_team'
import { LabelTransform, applyLabelTransforms } from '../apply_label_transforms'
import { IssueReactorInput, IssueReactor } from './issue_reactor'

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

const RELEVANT_ACTIONS_MISSING_LABEL: IssueReactorInput['action'][] = [
  'edited',
  'refresh',
  'opened',
]

export const addLabelReactor = new IssueReactor({
  id: 'issueAddLabelReactor',

  filter: ({ input: { action, issue } }) =>
    issue.state === 'open' && RELEVANT_ACTIONS_MISSING_LABEL.includes(action),

  async exec({ input: { issue, action }, log, githubApi }) {
    log.info(`issue #${issue.number} [action=${action}]`, { action })

    const existingLabels = issue.labels.map(label => label.name)
    const transformedLabels = applyLabelTransforms(
      existingLabels,
      labelTransforms,
    )

    if (transformedLabels) {
      await githubApi.setIssueLabels(issue.number, transformedLabels)
    }

    return {
      issue: issue.number,
      issueTitle: issue.title,
    }
  },
})
