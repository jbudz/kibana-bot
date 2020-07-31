import { Reactor, ReactorContext } from './reactor'

export interface RunReactorOptions<I> {
  context: ReactorContext
  input: I
}

export async function runReactors<I>(
  reactors: Reactor<I>[],
  options: RunReactorOptions<I>,
) {
  const combinedResult: Record<string, { skipped: boolean; result?: any }> = {}
  const promises = []
  const context = {
    ...options.context,
    input: options.input,
  }

  for (const reactor of reactors) {
    if (!reactor.filter(context)) {
      combinedResult[reactor.id] = {
        skipped: true,
      }
      continue
    }

    context.log.info({
      type: 'reactor execution',
      meta: {
        reactor: reactor.id,
      },
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
