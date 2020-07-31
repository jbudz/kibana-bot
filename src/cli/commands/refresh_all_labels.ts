import { runReactors, labelReactors, ReactorContext } from '../../reactors'
import { CliError } from '../errors'

export async function runRefreshAllLabelsCommand(
  reactorId: string,
  context: ReactorContext,
) {
  const { log, githubApi } = context

  const reactors = labelReactors.filter(reactor =>
    reactorId ? reactor.id === reactorId : true,
  )
  if (!reactors.length) {
    throw new CliError('reactor id does not match any known reactors')
  }

  for await (const label of githubApi.iterAllLabels()) {
    log.info({
      type: 'run reactors',
      message: `✅ ${label.name}`,
      extra: await runReactors(reactors, {
        context,
        input: {
          action: 'refresh',
          label,
        },
      }),
    })
  }
}
