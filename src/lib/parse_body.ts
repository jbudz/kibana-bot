import Util from 'util'
import Stream from 'stream'

import { ReqContext, BadRequestError } from '@spalger/micro-plus'
import { getRequestLogger } from './log'

const pipelineAsync = Util.promisify(Stream.pipeline)

class Fields<T> {
  private keys: Set<keyof T>

  constructor(private input: Record<keyof T, unknown>) {
    this.keys = new Set(Object.keys(input) as Array<keyof T>)
  }

  use(key: keyof T): unknown {
    if (this.keys.has(key)) {
      this.keys.delete(key)
      const value = this.input[key]

      return value == null ? undefined : this.input[key]
    }
  }

  string(key: keyof T) {
    const value = this.use(key)

    if (typeof value === 'string' && value.length !== 0) {
      return value
    }

    throw new BadRequestError(`\`${key}\` property must be a non-empty string`)
  }

  number(key: keyof T) {
    const value = this.use(key)

    if (typeof value === 'number' && !isNaN(value)) {
      return value
    }

    throw new BadRequestError(`\`${key}\` property must be a number`)
  }

  optionalString(key: keyof T) {
    const value = this.use(key)

    if (value === undefined) {
      return value
    }

    if (typeof value === 'string' && value.length !== 0) {
      return value
    }

    throw new BadRequestError(
      `\`${key}\` property must be a non-empty string when it is defined`,
    )
  }

  extraKeys() {
    if (this.keys.size) {
      return Array.from(this.keys)
    }
  }
}

type Transform<T extends {}> = (fields: Fields<T>) => T | Promise<T>

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

  if (!json.length) {
    log.error('missing request body')
    throw new BadRequestError(`request body is required`)
  }

  let body: unknown
  try {
    body = JSON.parse(json)
  } catch (error) {
    log.error('invalid json body', {
      '@type': 'invalid json body',
      extra: { json },
    })
    throw new BadRequestError(`request body is not valid json`)
  }

  if (!(typeof body === 'object' && body !== null)) {
    throw new BadRequestError(`request body must be an object`)
  }

  const fields = new Fields(body as Record<keyof T, unknown>)

  try {
    const parsed = await transform(fields)

    const extras = fields.extraKeys()
    if (extras?.length) {
      throw new BadRequestError(
        `unexpected fields in body: ${extras.join(', ')}`,
      )
    }

    return parsed
  } catch (error) {
    if (error instanceof BadRequestError) {
      log.error('request body validation failed', {
        '@type': 'request body validation failed',
        extra: { body },
      })

      throw new BadRequestError(`body parse error: ${error.message}`)
    }

    throw error
  }
}
