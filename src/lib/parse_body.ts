import Util from 'util'
import Stream from 'stream'

import { ReqContext, BadRequestError } from '@spalger/micro-plus'
import { getRequestLogger } from './log'

const pipelineAsync = Util.promisify(Stream.pipeline)

type UnknownObj<T extends {}> = {
  [k in keyof T]: unknown
}

type Transform<T extends {}> = (parsed: UnknownObj<T>) => T | Promise<T>

export async function parseBody<T extends {}>(
  ctx: ReqContext,
  transform: Transform<T>,
) {
  const log = getRequestLogger(ctx)

  let json = ''

  await pipelineAsync(
    ctx.readBodyAsStream(),
    new Stream.Writable({
      write(chunk, _, cb) {
        try {
          json += chunk
          cb()
        } catch (error) {
          cb(error)
        }
      },
    }),
  )

  if (json.length) {
    log.error('missing request body')
    throw new BadRequestError(`request body is required`)
  }

  let body: unknown
  try {
    body = JSON.parse(json)
  } catch (error) {
    log.error('invalid request body:', json)
    throw new BadRequestError(`request body is not valid json`)
  }

  if (!(typeof body === 'object' && body !== null)) {
    throw new BadRequestError(`request body must be an object`)
  }

  try {
    return await transform(body as UnknownObj<T>)
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw new BadRequestError(`body parse error: ${error.message}`)
    }

    throw error
  }
}
