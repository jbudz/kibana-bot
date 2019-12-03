import { asAsyncIterable } from './convert'

function* syncGenerator() {
  yield 1
  yield 2
  yield 3
}

function assertIsAsyncIterable(iterable: any) {
  expect(iterable).toHaveProperty('next', expect.any(Function))
  expect(iterable.next()).toEqual(expect.any(Promise))
}

describe('asAsyncIterable()', () => {
  it('converts values to async iterable', () => {
    assertIsAsyncIterable(asAsyncIterable([1, 2, 3]))
    assertIsAsyncIterable(asAsyncIterable('123'))
    assertIsAsyncIterable(asAsyncIterable(syncGenerator()))
  })
})
