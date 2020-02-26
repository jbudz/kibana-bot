import { GithubApi } from '../../lib'

export async function runBackportStateCommand(
  githubApi: GithubApi,
  options: { prIdInput: string },
) {
  const prId = Number.parseInt(options.prIdInput, 10)
  if (!isFinite(prId)) {
    throw new Error('invalid pr id')
  }

  const backportState = await githubApi.getBackportState(prId)
  console.info('backport state:')
  console.dir(backportState, { depth: Infinity })
}
