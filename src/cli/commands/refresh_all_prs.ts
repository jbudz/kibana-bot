import { runReactors, prReactors, ReactorContext } from '../../reactors'
import { CliError } from '../errors'

export async function runRefreshAllPrsCommand(
  reactorId: string,
  context: ReactorContext,
) {
  const { log, githubApi } = context

  const reactor = prReactors.find(reactor => reactor.id === reactorId)
  if (!reactor) {
    throw new CliError('reactor id does not match any known reactors')
  }

  for await (const pr of githubApi.ittrAllOpenPrs()) {
    log.info({
      type: 'run reactors',
      message: `✅ #${pr.number}`,
      extra: await runReactors([reactor], {
        context,
        input: {
          action: 'refresh',
          pr,
          prFromApi: true,
        },
      }),
    })
  }
}
