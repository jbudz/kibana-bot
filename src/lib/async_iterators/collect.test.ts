import { collect } from './collect'
import { asDelayedAsyncIter } from './convert'
import * as Map from './map'

const map = jest.spyOn(Map, 'map')

it('returns an array containing all values produced from async iterable', async () => {
  await expect(collect(asDelayedAsyncIter(0, [1, 2, 3, 4]))).resolves
    .toMatchInlineSnapshot(`
          Array [
            1,
            2,
            3,
            4,
          ]
        `)
})

it('passes input and limit to map() and returns result', async () => {
  map.mockImplementationOnce(async () => ['foo', 'bar'])

  const input = [1, 2, 3]
  const limit = 123

  await expect(collect(input, limit)).resolves.toMatchInlineSnapshot(`
                Array [
                  "foo",
                  "bar",
                ]
            `)

  expect(map).toHaveBeenCalledWith(input, expect.any(Function), { limit })
})
