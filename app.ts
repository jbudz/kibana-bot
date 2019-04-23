import { createMicroHandler, Route } from '@spalger/micro-plus'

module.exports = createMicroHandler({
  routes: [
    new Route('GET', '/', async (ctx) => {
      return {
        status: 200,
        body: {
          hello: 'world',
          url: ctx.baseUrl,
          foo: [
            ctx.method,
            ctx.pathname,
            ctx.query,
            ctx.url,
          ]
        }
      }
    })
  ]
})