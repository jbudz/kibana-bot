import * as Crypto from 'crypto'
import { Writable, pipeline } from 'stream'
import { promisify } from 'util'

import {
  ReqContext,
  getConfigVar,
  UnauthorizedError,
} from '@spalger/micro-plus'

import { Log } from '../lib'

const pipelineAsync = promisify(pipeline)
const WEBHOOK_SECRET = getConfigVar('GITHUB_WEBHOOK_SECRET')

export async function parseWebhook(ctx: ReqContext, log: Log) {
  let body = ''
  const hmac = Crypto.createHmac('sha1', WEBHOOK_SECRET)

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
    log.warn('invalid webhook signature', {
      signature,
      expectedSignature,
    })

    throw new UnauthorizedError('invalid webhook signature')
  }

  return {
    event: ctx.header('X-GitHub-Event'),
    webhook: JSON.parse(body),
  }
}
