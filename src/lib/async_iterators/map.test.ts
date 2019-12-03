import { map } from './map'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('option validation', () => {
  it('throws when limit < 0', async () => {
    await expect(
      map([], () => {}, { limit: -1 }),
    ).rejects.toMatchInlineSnapshot(
      `[TypeError: options.limit must be greater than or equal to 0]`,
    )

    await expect(
      map([], () => {}, { limit: -100 }),
    ).rejects.toMatchInlineSnapshot(
      `[TypeError: options.limit must be greater than or equal to 0]`,
    )

    await expect(
      map([], () => {}, { limit: -Infinity }),
    ).rejects.toMatchInlineSnapshot(
      `[TypeError: options.limit must be greater than or equal to 0]`,
    )
  })

  it('throws when concurrency < 1', async () => {
    await expect(
      map([], () => {}, { concurrency: 0 }),
    ).rejects.toMatchInlineSnapshot(
      `[TypeError: options.concurrency must be greater than or equal to 1]`,
    )

    await expect(
      map([], () => {}, { concurrency: -100 }),
    ).rejects.toMatchInlineSnapshot(
      `[TypeError: options.concurrency must be greater than or equal to 1]`,
    )

    await expect(
      map([], () => {}, { concurrency: -Infinity }),
    ).rejects.toMatchInlineSnapshot(
      `[TypeError: options.concurrency must be greater than or equal to 1]`,
    )
  })
})

describe('concurrency=1, limit=3', () => {
  it('transforms first 3 values in order, waiting for each before continuing', async () => {
    const transform = jest.fn(async (n, i) => {
      await sleep(n)
      return { i, n, date: Date.now() }
    })

    const results = await map([10, 20, 30, 40, 50, 60], transform, {
      concurrency: 1,
      limit: 3,
    })

    expect(results).toHaveLength(3)
    expect(transform.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          10,
          0,
        ],
        Array [
          20,
          1,
        ],
        Array [
          30,
          2,
        ],
      ]
    `)

    for (const [i, { n, date }] of results.entries()) {
      if (i === 0) {
        continue
      }

      const prev = results[i - 1]
      if (date < prev.date + n - 1) {
        throw new Error(
          `expected date ${i} to be at least ${n} milliseconds more than ${i -
            1} date: ${JSON.stringify(results)}`,
        )
      }
    }
  })
})

describe('limit=3', () => {
  it('transforms first 3 values in order', async () => {
    const transform = jest.fn((n, i) => n + i)

    const results = await map([10, 20, 30, 40, 50, 60], transform, {
      limit: 3,
    })

    expect(transform.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          10,
          0,
        ],
        Array [
          20,
          1,
        ],
        Array [
          30,
          2,
        ],
      ]
    `)
    expect(results).toMatchInlineSnapshot(`
      Array [
        10,
        21,
        32,
      ]
    `)
  })
})
