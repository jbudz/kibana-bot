import { asResult } from '../async'
import { map } from './map'
import { IterInput } from './convert'

/**
 * Same as `map()`, but results of `transform()` are converted to `Result` object
 * allowing multiple rejections to be collected as `RejectedResult` objects in the
 * result array.
 *
 * @param iterInput Any async iterable
 * @param transform A function that transforms each item
 * @param options see `map()`
 */
export async function settle<T, T2>(
  iterInput: IterInput<T>,
  transform: (item: T, index: number) => T2 | Promise<T2>,
  options: {
    concurrency?: number
    limit?: number
  } = {},
) {
  return await map(iterInput, (x, i) => asResult(transform(x, i)), options)
}
