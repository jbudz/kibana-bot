import { ReactorInput, PrReactor } from './pr_reactor'

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

    const fileNames = (await githubApi.getPrFiles(pr.number)).map(f => ({
      filename: f.filename,
      previous_filename: f.previous_filename,
    }))

    const allFilesInDocs = fileNames.every(
      f =>
        f.filename.startsWith('docs/') &&
        (!f.previous_filename || f.previous_filename.startsWith('docs/')),
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
      fileNames,
    }
  },
})
