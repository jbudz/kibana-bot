import { map } from './map'
import { IterInput } from './convert'

/**
 * Collect the values produced by an AsyncIterable into an array
 *
 * @param iterInput Any async iterable
 * @param limit Maximum number of items to collect
 */
export async function collect<T>(iterInput: IterInput<T>, limit = Infinity) {
  return await map(iterInput, (i) => i, {
    limit,
  })
}
