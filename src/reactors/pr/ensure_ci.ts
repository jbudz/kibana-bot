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

export const ensureCi = new PrReactor({
  id: 'ensureCi',

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

    const allFilesInDocs = files.every(
      f => fileStartsWith(f, 'docs/') || fileStartsWith(f, 'rfcs/'),
    )

    if (allFilesInDocs) {
      await githubApi.setCommitStatus(pr.head.sha, {
        context: CI_CONTEXT,
        description:
          'All files in PR are/were within the `docs` directory, so CI is not required',
        state: 'success',
      })
    }

    return {
      pr: pr.number,
      prTitle: pr.title,
      skipsCi,
      allFilesInDocs,
      fileNames: files.map(f =>
        f.previous_filename
          ? `${f.previous_filename} => ${f.filename}`
          : f.filename,
      ),
    }
  },
})
