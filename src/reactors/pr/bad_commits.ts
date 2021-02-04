import { ReactorInput, PrReactor } from './pr_reactor'
import { retryOn404, getCommitStatus } from '../../lib'

const RELEVANT_ACTIONS: ReactorInput['action'][] = [
  'opened',
  'synchronize',
  'refresh',
]

const STATUS_CONTEXT = 'update required'

interface BrokeZone {
  name: string
  branches: string[]
  start?: string
  stop: string
}

const PR_BROKE_ZONES: BrokeZone[] = [
  {
    name: 'Missing Elastic License 2.0',
    branches: ['7.11'],
    stop: '8a3bda4cfd0016e255465ccc2a601c38a1cd7ef7',
  },
  {
    name: 'Missing Elastic License 2.0',
    branches: ['7.x'],
    stop: '57af8462e45c92cf06c8338b7b1294205efcad24',
  },
  {
    name: 'Missing Elastic License 2.0',
    branches: ['master'],
    stop: '4584a8b570402aa07832cf3e5b520e5d2cfa7166',
  },
]

export const badCommits = new PrReactor({
  id: 'badCommits',

  filter: ({ input }) => RELEVANT_ACTIONS.includes(input.action),

  async exec({ githubApi, input: { pr }, log }) {
    const brokeZones = PR_BROKE_ZONES.filter(z =>
      z.branches.includes(pr.base.ref),
    )

    if (!brokeZones.length) {
      log.warn(
        `#${pr.number} to branch ${pr.base.ref} doesn't match any broke zones`,
        {
          '@type': 'brokeZoneNotMatched',
          extra: {
            prId: pr.number,
            baseBranch: pr.base.ref,
          },
        },
      )

      return {
        pr: pr.number,
        prHead: pr.head.sha,
      }
    }

    const results = []

    for (const brokeZone of brokeZones) {
      const { totalMissingCommits: commitsBehindStop } = await retryOn404(
        log,
        async () =>
          await githubApi.getMissingCommits(pr.head.sha, brokeZone.stop),
      )

      if (commitsBehindStop === 0) {
        results.push({
          brokeZone,
          commitsBehindStop,
        })
        continue
      }

      const startCommit = brokeZone.start
      let commitsBehindStart = 0

      if (startCommit) {
        ;({ totalMissingCommits: commitsBehindStart } = await retryOn404(
          log,
          async () =>
            await githubApi.getMissingCommits(pr.head.sha, startCommit),
        ))
      }

      results.push({
        brokeZone,
        commitsBehindStop,
        commitsBehindStart,
      })

      if (commitsBehindStart > 0) {
        continue
      }

      log.warn(`#${pr.number} is in the "broke zone" [${brokeZone.name}]`, {
        '@type': 'prInBrokeZone',
        extra: {
          brokeZone,
          commitsBehindStart,
          commitsBehindStop,
          prId: pr.number,
          baseBranch: pr.base.ref,
        },
      })

      const currentStatus = getCommitStatus(
        await githubApi.getCommitStatus(pr.head.sha),
        STATUS_CONTEXT,
      )

      if (currentStatus === 'failure') {
        continue
      }

      await githubApi.setCommitStatus(pr.head.sha, {
        context: STATUS_CONTEXT,
        state: 'failure',
        description: 'please merge upstream into this PR now',
      })
    }

    return {
      pr: pr.number,
      prHead: pr.head.sha,
      results,
    }
  },
})
