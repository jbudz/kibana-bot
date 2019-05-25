import { Reactor, ReactorContext } from './reactor'

export async function runReactors<C extends ReactorContext>(
  reactors: Reactor<C>[],
  {
    force = false,
    context,
  }: {
    force?: boolean
    context: C
  },
) {
  const combinedResult: Record<string, { skipped: boolean; result?: any }> = {}
  const promises = []

  for (const reactor of reactors) {
    if (!force && !reactor.filter(context)) {
      combinedResult[reactor.id] = {
        skipped: true,
      }
      continue
    }

    context.log.info(`Executing ${reactor.id} reactor`, {
      action: 'executeReactor',
      reactor: reactor.id,
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
