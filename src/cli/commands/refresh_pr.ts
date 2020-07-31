import { runReactors, prReactors, ReactorContext } from '../../reactors'
import { CliError } from '../errors'

export async function runRefreshPrCommand(
  prId: string,
  reactorId: string,
  context: ReactorContext,
) {
  const { log, githubApi } = context

  if (!prId) {
    throw new CliError('missing pr id', { showHelp: true })
  }
  if (typeof prId !== 'string' || !/^\d+$/.test(prId)) {
    throw new CliError('invalid pr id', { showHelp: true })
  }

  if (reactorId && typeof reactorId !== 'string') {
    throw new CliError('invalid reactor name param', { showHelp: true })
  }

  const pr = await githubApi.getPr(Number.parseInt(prId, 10))

  log.info({
    type: 'run reactors',
    message: `✅ success`,
    extra: await runReactors(
      prReactors.filter(r => !reactorId || r.id === reactorId),
      {
        context,
        input: {
          action: 'refresh',
          pr,
          prFromApi: true,
        },
      },
    ),
  })
}
