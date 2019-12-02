export async function mapAll<T, T2>(
  iter: AsyncIterable<T>,
  map: (item: T) => T2,
): Promise<T2[]> {
  const values: T2[] = []
  for await (const value of iter) {
    values.push(map(value))
  }
  return values
}

export type SettleSuccess<T> = {
  type: 'success'
  value: T
}

export type SettleFailure = {
  type: 'failure'
  error: Error
}

export type SettleResult<T> = SettleSuccess<T> | SettleFailure

export async function settleMapAll<T, T2>(
  iter: AsyncIterable<T>,
  map: (item: T) => Promise<T2>,
): Promise<Array<SettleResult<T2>>> {
  const promises = await mapAll(
    iter,
    async (item): Promise<SettleResult<T2>> => {
      try {
        return {
          type: 'success',
          value: await map(item),
        }
      } catch (error) {
        if (error instanceof Error) {
          return {
            type: 'failure',
            error,
          }
        }

        return {
          type: 'failure',
          error: new Error(`${error} thrown`),
        }
      }
    },
  )

  return Promise.all(promises)
}

export async function attemptMapAll<T>(
  iter: AsyncIterable<T>,
  map: (item: T) => Promise<void>,
): Promise<Array<SettleFailure>> {
  return settleMapAll(iter, map).then(results =>
    results.filter((r): r is SettleFailure => r.type === 'failure'),
  )
}
