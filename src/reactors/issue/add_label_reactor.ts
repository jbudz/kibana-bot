import { LabelTransform } from '../'
import { IssueReactorInput, IssueReactor } from './issue_reactor'
import { issueLabelTransforms as presentationTeamTransforms } from '../../teams/presentation_team'

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
    const labelNames = issue.labels.map(l => l.name)
    let labels = [...labelNames]

    labelTransforms.forEach(check => {
      labels = check(labels)
    })

    const diff = labels.filter(label => !labelNames.includes(label))

    if (diff.length > 0) {
      await githubApi.setIssueLabels(issue.number, labels)
    }

    return {
      issue: issue.number,
      issueTitle: issue.title,
    }
  },
})
