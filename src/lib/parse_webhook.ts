import * as Crypto from 'crypto'
import { Writable, pipeline } from 'stream'
import { promisify } from 'util'

import { ReqContext, UnauthorizedError, getRequestLogger } from '../lib'

const pipelineAsync = promisify(pipeline)

export async function parseWebhook(ctx: ReqContext) {
  const log = getRequestLogger(ctx)
  const webhookSecret = ctx.server.config.get('githubWebhookSecret')

  let body = ''
  const hmac = Crypto.createHmac('sha1', webhookSecret)

  await pipelineAsync(
    ctx.readBodyAsStream(),
    new Writable({
      write(chunk, _, cb) {
        try {
          body += chunk
          hmac.update(chunk)
          cb()
        } catch (error) {
          cb(error)
        }
      },
    }),
  )

  const signature = ctx.header('X-Hub-Signature')
  const expectedSignature = `sha1=${hmac.digest('hex')}`
  if (expectedSignature !== signature) {
    log.warning({
      type: 'invalid github webhook signature',
      extra: {
        signature,
        expectedSignature,
      },
    })

    throw new UnauthorizedError('invalid webhook signature')
  }

  return {
    event: ctx.header('X-GitHub-Event'),
    webhook: JSON.parse(body),
  }
}
