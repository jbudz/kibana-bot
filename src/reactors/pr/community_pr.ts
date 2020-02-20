import { ReactorInput, PrReactor } from './pr_reactor'
import { GithubApiPr } from '../../github_api_types'
import { createSlackApi } from '../../lib'

const RELEVANT_ACTIONS: ReactorInput['action'][] = [
  'opened',
  'ready_for_review',
]

const NON_COMMUNITY_ASSOCIATIONS: GithubApiPr['author_association'][] = [
  'MEMBER',
  'OWNER',
  'COLLABORATOR',
]

export const communityPr = new PrReactor({
  id: 'communityPr',

  filter: ({ input: { action, pr } }) =>
    pr.state === 'open' && !pr.draft && RELEVANT_ACTIONS.includes(action),

  async exec({ input: { pr }, log, es }) {
    const isCommunityPr = !NON_COMMUNITY_ASSOCIATIONS.includes(
      pr.author_association,
    )

    if (isCommunityPr) {
      const slack = createSlackApi(log, es)
      await slack.broadcast(`New community PR! ${pr.html_url}`)
    }

    return {
      pr: pr.number,
      prTitle: pr.title,
      isCommunityPr,
    }
  },
})
