import { ReactorInput, PrReactor } from './pr_reactor'
import { retryOn404, getCommitStatus } from '../../lib'

const RELEVANT_ACTIONS: ReactorInput['action'][] = [
  'opened',
  'synchronize',
  'refresh',
]

const STATUS_CONTEXT = 'prbot:bad commits'

interface BrokeZone {
  name: string
  branches: string[]
  start: string
  stop: string
}

const PR_BROKE_ZONES: BrokeZone[] = [
  {
    name: 'broken Jenkinsfile',
    branches: ['master'],
    start: '27d23c41847e79e6e1dfaef25982d7a2165a490d',
    stop: 'e92857090b0809f3deca7ea519973d0363ff7d27',
  },
  {
    name: 'broken Jenkinsfile',
    branches: ['7.x'],
    start: '17670959dc40a3dd8942f352a91a6c57182241f9',
    stop: 'a82e8825c04bce6b964635b7824cf1e4a1ea0772',
  },
  {
    name: 'broken Jenkinsfile',
    branches: ['7.4'],
    start: '14b69dc6ea1fb83c523079f86a71001be532cca1',
    stop: '6449088013b1de849f6add7e764ef73109c34896',
  },
  {
    name: 'broken Jenkinsfile',
    branches: ['7.3'],
    start: '2bbd40d4850412095dcb6f19242c0ab9d8986dcf',
    stop: '57d4be6eb772c8ed50889e67726f498fd547cea7',
  },
  {
    name: 'broken Jenkinsfile',
    branches: ['6.8'],
    start: '2f67e777601249fa3e2d5da827f9414ab3ba6dcc',
    stop: '281e2fe50cd0b9f7605d82846a6091193dd6dc11',
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
      log.warning({
        type: 'brokeZoneNotMatched',
        message: `#${pr.number} to branch ${pr.base.ref} doesn't match any broke zones`,
        extra: {
          prId: pr.number,
          baseBranch: pr.base.ref,
        },
      })

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

      const { totalMissingCommits: commitsBehindStart } = await retryOn404(
        log,
        async () =>
          await githubApi.getMissingCommits(pr.head.sha, brokeZone.start),
      )

      results.push({
        brokeZone,
        commitsBehindStop,
        commitsBehindStart,
      })

      if (commitsBehindStart > 0) {
        continue
      }

      log.warning({
        type: 'prInBrokeZone',
        message: `#${pr.number} is in the "broke zone" [${brokeZone.name}]`,
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
        description: 'please merge upstream now',
      })
    }

    return {
      pr: pr.number,
      prHead: pr.head.sha,
      results,
    }
  },
})
