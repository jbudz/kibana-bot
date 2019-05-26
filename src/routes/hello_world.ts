import { Route } from '@spalger/micro-plus'

export const helloWorldRoute = new Route('GET', '/', async () => ({
  status: 200,
  body: {
    hello: 'world',
  },
}))
