import { attempt } from './attempt'

it('returns FailedResults, calls transform for each input', async () => {
  const mock = jest.fn(n => (n === 2 ? Promise.reject(n) : Promise.resolve(n)))

  await expect(attempt([1, 2, 3], mock)).resolves.toMatchInlineSnapshot(`
          Array [
            RejectedResult {
              "reason": [Error: 2 thrown],
              "status": "rejected",
            },
          ]
        `)

  expect(mock).toHaveBeenCalledTimes(3)
})
