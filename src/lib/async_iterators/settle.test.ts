import { settle } from './settle'

it('resolves to a list of records based on promise success, in the right order', async () => {
  await expect(
    settle([1, 100, 2], async x => {
      await new Promise(resolve => setTimeout(resolve, x))
      return x
    }),
  ).resolves.toMatchInlineSnapshot(`
          Array [
            ResolvedResult {
              "status": "fulfilled",
              "value": 1,
            },
            ResolvedResult {
              "status": "fulfilled",
              "value": 100,
            },
            ResolvedResult {
              "status": "fulfilled",
              "value": 2,
            },
          ]
        `)
})
