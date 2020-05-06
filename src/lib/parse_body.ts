import Util from 'util'
import Stream from 'stream'

import { ReqContext, BadRequestError } from '@spalger/micro-plus'
import { getRequestLogger } from './log'

const pipelineAsync = Util.promisify(Stream.pipeline)

type ArrayItem<T> = T extends Array<infer X> ? X : never

type Reader<T> = (fields: Fields<T>) => T

class Fields<T> {
  private keys: Set<keyof T>

  static parse<T>(
    input: Record<keyof T, unknown>,
    name: string,
    reader: Reader<T>,
  ) {
    const fields = new Fields<T>(input, `${name}.`)
    const parsed = reader(fields)

    const extras = fields.extraKeys()
    if (extras?.length) {
      throw new BadRequestError(
        `unexpected fields in ${name}: ${extras.join(', ')}`,
      )
    }

    return parsed
  }

  constructor(
    private input: Record<keyof T, unknown>,
    private keyPrefix: string,
  ) {
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

    throw new BadRequestError(
      `\`${this.keyPrefix}${key}\` property must be a non-empty string`,
    )
  }

  number(key: keyof T) {
    const value = this.use(key)

    if (typeof value === 'number' && !isNaN(value)) {
      return value
    }

    throw new BadRequestError(
      `\`${this.keyPrefix}${key}\` property must be a number`,
    )
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
      `\`${this.keyPrefix}${key}\` property must be a non-empty string when it is defined`,
    )
  }

  arrayOfObjects<K extends keyof T, I extends T[K]>(
    key: K,
    reader: Reader<ArrayItem<I>>,
  ) {
    const items = this.use(key)

    if (!Array.isArray(items)) {
      throw new BadRequestError(
        `\`${this.keyPrefix}${key}\` property must be an array`,
      )
    }

    return items.map((item, i) =>
      Fields.parse(item, `${this.keyPrefix}${key}[${i}]`, reader),
    )
  }

  extraKeys() {
    if (this.keys.size) {
      return Array.from(this.keys)
    }
  }
}

export async function parseBody<T>(ctx: ReqContext, transform: Reader<T>) {
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

  try {
    return Fields.parse(body as Record<keyof T, unknown>, 'body', transform)
  } catch (error) {
    if (error instanceof BadRequestError) {
      log.error('request body validation failed', {
        '@type': 'request body validation failed',
        extra: { body },
      })
    }

    throw error
  }
}
