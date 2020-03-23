import { ReactorInput, PrReactor } from './pr_reactor'
import { GithubApiPr } from '../../github_api_types'
import { createSlackApi } from '../../lib'

const RELEVANT_ACTIONS: ReactorInput['action'][] = [
  'opened',
  'refresh',
  'ready_for_review',
]

const CAN_COMMIT_ASSOCIATIONS: GithubApiPr['author_association'][] = [
  'MEMBER',
  'OWNER',
  'COLLABORATOR',
]

/** users who should never trigger community pr notifications */
const EXCLUDED_USERS = ['renovate[bot]']

export const communityPr = new PrReactor({
  id: 'communityPr',

  filter: ({ input: { action, pr } }) =>
    pr.state === 'open' &&
    !pr.draft &&
    !EXCLUDED_USERS.includes(pr.user.login) &&
    RELEVANT_ACTIONS.includes(action),

  async exec({ input: { pr, action }, githubApi, log, es }) {
    // if the pr.author_association indicates that the user has commit access then
    // we don't need to go to the API, but if it doesn't it might be because the pr
    // object sent by the webhook isn't fetched with authentication and can't show
    // us org members who have hidden their association on their profile. To see them
    // we have to re-fetch the PR from the API.
    const authdPr = CAN_COMMIT_ASSOCIATIONS.includes(pr.author_association)
      ? pr
      : await githubApi.getPr(pr.number)

    const isCommunityPr = !CAN_COMMIT_ASSOCIATIONS.includes(
      authdPr.author_association,
    )

    if (isCommunityPr) {
      if (action !== 'refresh') {
        const slack = createSlackApi(log, es)
        await slack.broadcast(`New community PR! ${pr.html_url}`)
      }

      await githubApi.setPrLabels(pr.number, [
        ...pr.labels.map(l => l.name),
        `💝community`,
      ])
    }

    return {
      pr: pr.number,
      prTitle: pr.title,
      isCommunityPr,
    }
  },
})
