export type IterInput<T> = AsyncIterable<T> | Iterable<T>

/**
 * Convert a variable that is either an async iterable or sync iterable to an async iterable
 *
 * @param iterInput Either an async or sync iterable
 */
export async function* asAsyncIterable<T>(iterInput: IterInput<T>) {
  yield* iterInput
}

/**
 *
 */
export async function* asDelayedAsyncIter<T>(
  ms: number,
  iterInput: IterInput<T>,
) {
  for await (const item of asAsyncIterable(iterInput)) {
    await new Promise((resolve) => setTimeout(resolve, ms))
    yield item
  }
}
