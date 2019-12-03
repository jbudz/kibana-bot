import {
  RejectedResult,
  ResolvedResult,
  asResult,
  isRejectedResult,
  isResolvedResult,
  isPromise,
  settle,
} from './async'

describe('isResolvedResult()', () => {
  it('returns true for resolved results, and nothing else', () => {
    expect(isResolvedResult(new ResolvedResult('foo'))).toBe(true)
    expect(isResolvedResult(new RejectedResult(new Error()))).toBe(false)
    expect(isResolvedResult(new Error())).toBe(false)
    expect(isResolvedResult(new Date())).toBe(false)
    expect(isResolvedResult(/foo/)).toBe(false)
    expect(isResolvedResult(123)).toBe(false)
    expect(isResolvedResult({ foo: 'bar' })).toBe(false)
    expect(isResolvedResult('foo')).toBe(false)
    expect(isResolvedResult([1, 2, 3])).toBe(false)
  })
})

describe('isRejectedResult()', () => {
  it('returns true for rejected results, and nothing else', () => {
    expect(isRejectedResult(new ResolvedResult('foo'))).toBe(false)
    expect(isRejectedResult(new RejectedResult(new Error()))).toBe(true)
    expect(isRejectedResult(new Error())).toBe(false)
    expect(isRejectedResult(new Date())).toBe(false)
    expect(isRejectedResult(/foo/)).toBe(false)
    expect(isRejectedResult(123)).toBe(false)
    expect(isRejectedResult({ foo: 'bar' })).toBe(false)
    expect(isRejectedResult('foo')).toBe(false)
    expect(isRejectedResult([1, 2, 3])).toBe(false)
  })
})

describe('asResult()', () => {
  it('resolves resolved promsies with a ResolvedResult', async () => {
    await expect(asResult(Promise.resolve(123))).resolves
      .toMatchInlineSnapshot(`
            ResolvedResult {
              "status": "fulfilled",
              "value": 123,
            }
          `)
  })
  it('resolves rejected promsies with a ResolvedResult', async () => {
    await expect(asResult(Promise.reject(new Error('foo')))).resolves
      .toMatchInlineSnapshot(`
            RejectedResult {
              "reason": [Error: foo],
              "status": "rejected",
            }
          `)
  })
  it('converts non-Error rejected values to Error objects', async () => {
    await expect(asResult(Promise.reject(123))).resolves.toMatchInlineSnapshot(`
            RejectedResult {
              "reason": [Error: 123 thrown],
              "status": "rejected",
            }
          `)
  })
})

describe('isPromise()', () => {
  it('returns true for promise and promise-like objects, nothing else', () => {
    expect(isPromise(Promise.resolve())).toBe(true)
    expect(isPromise(Promise.reject())).toBe(true)
    expect(isPromise({ then() {} })).toBe(false)
    expect(isPromise(false)).toBe(false)
    expect(isPromise({})).toBe(false)
    expect(isPromise(/foo/)).toBe(false)
    expect(isPromise(123)).toBe(false)
    expect(isPromise('')).toBe(false)
  })
})

describe('settle()', () => {
  it('returns a promise that resolves to a list of Result objects', async () => {
    await expect(
      settle([Promise.resolve(1), Promise.resolve(2), Promise.reject(3)]),
    ).resolves.toMatchInlineSnapshot(`
            Array [
              ResolvedResult {
                "status": "fulfilled",
                "value": 1,
              },
              ResolvedResult {
                "status": "fulfilled",
                "value": 2,
              },
              RejectedResult {
                "reason": [Error: 3 thrown],
                "status": "rejected",
              },
            ]
          `)
  })
})
