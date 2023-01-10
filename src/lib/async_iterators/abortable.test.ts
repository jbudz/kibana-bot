import { AbortController } from 'abort-controller'

import { AbortError, makeAbortable, isAbortError } from './abortable'

it('aborts iterable when signal is triggered', async () => {
  const abort = new AbortController()
  const spy = jest.fn((n) => n)

  const iter = (function* () {
    try {
      yield spy(1)
      yield spy(2)
      yield spy(3)
    } finally {
      spy('finally')
    }
  })()

  const abortable = makeAbortable(iter, abort.signal)

  const first = await abortable.next()
  expect(first).toHaveProperty('value', 1)
  expect(spy).toHaveBeenCalledTimes(1)

  const second = await abortable.next()
  expect(second).toHaveProperty('value', 2)
  expect(spy).toHaveBeenCalledTimes(2)

  debugger
  abort.abort()
  await expect(abortable.next()).rejects.toMatchInlineSnapshot(
    `[Error: The operation was aborted]`,
  )

  expect(spy).toHaveBeenCalledTimes(3)
  expect(spy.mock.calls).toMatchInlineSnapshot(`
    [
      [
        1,
      ],
      [
        2,
      ],
      [
        "finally",
      ],
    ]
  `)
})

describe('isAbortError()', () => {
  it('only returns true for `AbortError`s', () => {
    expect(isAbortError(new AbortError())).toBe(true)
    expect(isAbortError(true)).toBe(false)
    expect(isAbortError(false)).toBe(false)
    expect(isAbortError(1)).toBe(false)
    expect(isAbortError([12, 3])).toBe(false)
    expect(isAbortError('foo')).toBe(false)
    expect(isAbortError(/foo/)).toBe(false)
  })
})
