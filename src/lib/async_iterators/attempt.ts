import { isRejectedResult } from '../async'
import { IterInput } from './convert'
import { settle } from './settle'

/**
 * Same as `settle()`, but only failed values are returned
 *
 * @param iterInput Any async iterable
 * @param transform A function that transforms each item
 * @param options see `map()`
 */
export async function attempt<T, T2 = T>(
  iterInput: IterInput<T>,
  transform: (item: T, index: number) => T2 | Promise<T2>,
  options: {
    concurrency?: number
    limit?: number
  } = {},
) {
  const results = await settle(iterInput, transform, options)
  return results.filter(isRejectedResult)
}
