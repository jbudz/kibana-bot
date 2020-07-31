import { Route } from '../lib'

export const helloWorldRoute = new Route({
  method: 'GET',
  path: '/',
  handler: async () => ({
    status: 200,
    body: {
      hello: 'world',
    },
  }),
})
