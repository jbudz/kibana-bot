import { ReactorInput, PrReactor } from './pr_reactor'
import { getIsConfigOnlyChange, retryOn404 } from '../../lib'

const CI_CONTEXT = 'kibana-ci'
const SKIP_CI_RE = /.*\[skip\W+ci\].*/
const RELEVANT_ACTIONS: ReactorInput['action'][] = [
  'opened',
  'synchronize',
  'ready_for_review',
  'reopened',
  'refresh',
]

export const configOnlyChangeCi = new PrReactor({
  id: 'configOnlyChangeCi',

  filter: ({ input: { action, pr } }) =>
    pr.state === 'open' && RELEVANT_ACTIONS.includes(action),

  async exec({ input: { pr }, githubApi, log }) {
    const skipsCi = SKIP_CI_RE.test(pr.title) || SKIP_CI_RE.test(pr.body)
    if (!skipsCi) {
      return {
        pr: pr.number,
        prTitle: pr.title,
        skipsCi,
      }
    }

    const files = await retryOn404(log, () => githubApi.getPrFiles(pr.number))
    const isConfigOnlyChange = getIsConfigOnlyChange(files)

    if (isConfigOnlyChange) {
      await githubApi.setCommitStatus(pr.head.sha, {
        context: CI_CONTEXT,
        description: 'Config only change detected, CI is not required',
        state: 'success',
      })
    }

    return {
      pr: pr.number,
      prTitle: pr.title,
      skipsCi,
      isConfigOnlyChange,
      fileNames: files.map(f =>
        f.previous_filename
          ? `${f.previous_filename} => ${f.filename}`
          : f.filename,
      ),
    }
  },
})
