import { ReactorInput, PrReactor } from './pr_reactor'
import { GithubApiPullRequestFile } from '../../github_api_types'

const CI_CONTEXT = 'kibana-ci'
const SKIP_CI_RE = /.*\[skip\W+ci\].*/
const RELEVANT_ACTIONS: ReactorInput['action'][] = [
  'opened',
  'synchronize',
  'ready_for_review',
  'reopened',
  'refresh',
]

export const docsOnlyChangeCi = new PrReactor({
  id: 'docsOnlyChangeCi',

  filter: ({ input: { action, pr } }) =>
    pr.state === 'open' && RELEVANT_ACTIONS.includes(action),

  async exec({ input: { pr }, githubApi }) {
    const skipsCi = SKIP_CI_RE.test(pr.title) || SKIP_CI_RE.test(pr.body)
    if (!skipsCi) {
      return {
        pr: pr.number,
        prTitle: pr.title,
        skipsCi,
      }
    }

    const files = await githubApi.getPrFiles(pr.number)

    const fileStartsWith = (f: GithubApiPullRequestFile, startsWith: string) =>
      f.filename.startsWith(startsWith) &&
      (!f.previous_filename || f.previous_filename.startsWith(startsWith))

    const docsOnlyChange = files.every(
      f => fileStartsWith(f, 'docs/') || fileStartsWith(f, 'rfcs/'),
    )

    if (docsOnlyChange) {
      await githubApi.setCommitStatus(pr.head.sha, {
        context: CI_CONTEXT,
        description: 'Docs only change detected, CI is not required',
        state: 'success',
      })
    }

    return {
      pr: pr.number,
      prTitle: pr.title,
      skipsCi,
      docsOnlyChange,
      fileNames: files.map(f =>
        f.previous_filename
          ? `${f.previous_filename} => ${f.filename}`
          : f.filename,
      ),
    }
  },
})
