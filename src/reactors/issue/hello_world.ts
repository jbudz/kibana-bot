import { IssueReactorInput, IssueReactor } from './issue_reactor'

const RELEVANT_ACTIONS: IssueReactorInput['action'][] = ['edited', 'refresh']

export const helloWorld = new IssueReactor({
  id: 'helloWorld',

  filter: ({ input: { action, issue } }) =>
    issue.state === 'open' && RELEVANT_ACTIONS.includes(action),

  async exec({ input: { issue, action }, log }) {
    log.info(`issue #${issue.number} [action=${action}]`, { action })

    return {
      issue: issue.number,
      issueTitle: issue.title,
    }
  },
})
