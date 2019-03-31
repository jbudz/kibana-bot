import { createMicroHandler, Route, getConfigVar } from '@spalger/micro-plus'
import { validateBasicAuth, findOldPRs } from './lib'

const ZAPIER_PW = getConfigVar('ZAPIER_PW');

module.exports = createMicroHandler({
  routes: [
    new Route('PUT', '/zapier', async (ctx) => {
      validateBasicAuth(ctx, 'zapier', ZAPIER_PW);

      const { id } = (await ctx.readBodyAsJson()) as { id: string };
      const oldPrs = await findOldPRs()

      return {
        status: 200,
        body: {
          id,
          oldPrs
        }
      }
    }),
  ]
})