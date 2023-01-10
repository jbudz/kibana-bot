import AbortController from 'abort-controller'

import { isPromise } from '../async'
import { makeAbortable, isAbortError } from './abortable'
import { IterInput } from './convert'

/**
 * Collect the values from `iter`, passing them to `transform()` to be transformed
 * into another value. If `transform()` returns a promise the resolve value will be
 * in the result array. If `transform()` throws or rejects the first error will be
 * the rejection value of the promise returned.
 *
 * If `options.limit` is set then only that number of values will be collected from `iter`
 *
 * If `options.concurrency` is set then only that number of promises returned from `transform()` will
 * be allowed to process at a time.
 *
 * @param iterInput Any async iterable
 * @param transform A function that can transform each item
 * @param options.concurrency Maximum number of concurrent `map` calls that can be in flight
 * @param options.limit Maximum number of items to collect from `iter`
 */
export async function map<T, T2>(
  iterInput: IterInput<T>,
  transform: (item: T, i: number) => T2 | Promise<T2>,
  options: {
    concurrency?: number
    limit?: number
  } = {},
): Promise<T2[]> {
  const concurrency = options.concurrency ?? Infinity
  if (concurrency < 1) {
    throw new TypeError(
      'options.concurrency must be greater than or equal to 1',
    )
  }

  const limit = options.limit ?? Infinity
  if (limit < 0) {
    throw new TypeError('options.limit must be greater than or equal to 0')
  }
  if (limit === 0) {
    return []
  }

  let onNextComplete: ((x: void) => void) | undefined
  let activeCount = 0
  const abort = new AbortController()
  const promises: Array<Promise<T2> | T2> = []

  const errorHandler = (error: any) => {
    abort.abort()
    throw error
  }

  const finallyHandler = () => {
    activeCount -= 1
    if (onNextComplete) {
      onNextComplete()
      onNextComplete = undefined
    }
  }

  try {
    let iCounter = 0
    for await (const item of makeAbortable(iterInput, abort.signal)) {
      if (activeCount === concurrency) {
        await new Promise(resolve => {
          onNextComplete = resolve
        })
      }

      const value = transform(item, iCounter++)
      if (isPromise(value)) {
        activeCount += 1
        promises.push(value.catch(errorHandler).finally(finallyHandler))
      } else {
        promises.push(value)
      }

      if (promises.length === limit) {
        break
      }
    }
  } catch (error) {
    if (!isAbortError(error)) {
      throw error
    }
  }

  return await Promise.all(promises)
}
