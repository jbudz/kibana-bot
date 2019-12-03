/**
 * Result that represents a fulfilled promise value
 */
export class ResolvedResult<T> {
  public readonly status = 'fulfilled'
  constructor(public readonly value: T) {}
}

/**
 * Result that represents a rejected promise value
 */
export class RejectedResult {
  public readonly status = 'rejected'
  constructor(public readonly reason: Error) {}
}

/**
 * Result types produced by settle
 */
export type Result<T> = ResolvedResult<T> | RejectedResult

/**
 * Determine if `x` is a Resolved value
 *
 * @param x any value
 */
export const isResolvedResult = <T>(x: any): x is ResolvedResult<T> =>
  x instanceof ResolvedResult

/**
 * Determine if `x` is a RejectedResult value
 * @param x any value
 */
export const isRejectedResult = (x: any): x is RejectedResult =>
  x instanceof RejectedResult

/**
 * Cast a promise to a promise that returns a `Result` object based
 * on the result of the promise.
 *
 * @param promise any promise
 */
export async function asResult<T>(promise: T | Promise<T>): Promise<Result<T>> {
  try {
    return new ResolvedResult(await promise)
  } catch (error) {
    return new RejectedResult(
      error instanceof Error ? error : new Error(`${error} thrown`),
    )
  }
}

/**
 * Determine if `x` is a promise-like value with a `.then()` method
 *
 * @param x any value
 */
export function isPromise<T>(x: any): x is Promise<T> {
  return (
    typeof x === 'object' &&
    x &&
    typeof x.then === 'function' &&
    typeof x.catch === 'function' &&
    typeof x.finally === 'function'
  )
}

/**
 * Convert an array of Promises to an array of `Result` objects, where each
 * item represents the result of the promise in that position of `promises`
 *
 * @param promises An array of promises
 */
export function settle<T>(promises: Promise<T>[]) {
  return Promise.all(promises.map(asResult))
}
