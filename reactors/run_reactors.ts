import { Reactor, ReactorContext } from './reactor'

export interface RunReactorOptions<C> {
  context: C
}

export async function runReactors<C extends ReactorContext>(
  reactors: Reactor<C>[],
  { context }: RunReactorOptions<C>,
) {
  const combinedResult: Record<string, { skipped: boolean; result?: any }> = {}
  const promises = []

  for (const reactor of reactors) {
    if (!reactor.filter(context)) {
      combinedResult[reactor.id] = {
        skipped: true,
      }
      continue
    }

    context.log.info(`Executing reactor [${reactor.id}]`, {
      '@type': 'executeReactor',
      reactorId: reactor.id,
    })

    promises.push(
      reactor.exec(context).then(result => {
        combinedResult[reactor.id] = {
          skipped: false,
          result,
        }
      }),
    )
  }

  await Promise.all(promises)

  return combinedResult
}
