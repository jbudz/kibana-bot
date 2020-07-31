import { Response } from './route'

export interface ErrorResponseOptions {
  message?: string
  publicData?: Record<string, unknown>
  internalData?: Record<string, unknown>
}

export class ErrorResponse implements Response {
  static readonly STATUS: number = 500
  static readonly MESSAGE: string = 'Unexpected error'

  static fromThrown(thrown: unknown) {
    if (thrown instanceof ErrorResponse) {
      return thrown
    }

    const error =
      thrown instanceof Error ? thrown : new Error(`${thrown} thrown`)

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new ServerError({
      message: `${this.MESSAGE} [${error.message}]`,
      internalData: {
        message: error.message,
        stack: error.stack,
        class: error.constructor.name,
        keys: Object.keys(error),
      },
    })
  }

  public readonly status: number
  public readonly message: string
  public readonly headers: undefined
  public readonly publicData?: Record<string, unknown>
  public readonly internalData?: Record<string, unknown>

  constructor(options: string | ErrorResponseOptions = {}) {
    if (typeof options === 'string') {
      options = {
        message: options,
      } as ErrorResponseOptions
    }

    const Class = this.constructor as typeof ErrorResponse
    this.message = options.message || Class.MESSAGE
    this.status = Class.STATUS
    this.publicData = options.publicData
    this.internalData = options.internalData
  }

  get body() {
    return this.toJSON()
  }

  toJSON() {
    return {
      type: this.constructor.name,
      status: this.status,
      message: this.message,
      data: this.publicData,
    }
  }
}

export class BadRequestError extends ErrorResponse {
  static readonly STATUS = 400
  static readonly MESSAGE = 'Bad request'
}

export class UnauthorizedError extends ErrorResponse {
  static readonly STATUS = 401
  static readonly MESSAGE = 'Unauthorized'
}

export class NotFoundError extends ErrorResponse {
  static readonly STATUS = 404
  static readonly MESSAGE = 'Not found'
}

export class ServerError extends ErrorResponse {
  static readonly STATUS = 500
  static readonly MESSAGE = 'Server error'
}
