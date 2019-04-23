import { createMicroHandler, Route } from '@spalger/micro-plus'

module.exports = createMicroHandler({
  routes: [
    new Route('GET', '/', async () => ({
      status: 200,
      body: {
        hello: 'world',
      }
    }))
  ]
})