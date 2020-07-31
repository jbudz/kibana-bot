import { Writable } from 'stream'
import { inspect } from 'util'

import winston from 'winston'
import apm from 'elastic-apm-node'
import chalk from 'chalk'
import { ElasticsearchTransport } from 'winston-elasticsearch'

import { makeAutoCache } from './auto_cache'
import { ReqContext } from './req_context'
import { getRequestId } from './request_id'
import { EsClient } from './es'
import { has } from './utils'

const LEVEL_TAG = {
  info: chalk.blueBright('info'),
  error: chalk.redBright(' err'),
  warn: chalk.redBright('warn'),
  debug: chalk.gray(' dbg'),
}

const printLogEntry = (info: winston.LogEntry) => {
  const tag = has(LEVEL_TAG, info.level)
    ? LEVEL_TAG[info.level]
    : LEVEL_TAG.info

  let line = `${tag}: [${info.type}]`
  if (info.message && info.message !== info.type) {
    line += ` ${info.message}`
  }

  if (info.meta) {
    for (const [key, value] of Object.entries(info.meta)) {
      line += ` [${key}=${value}]`
    }
  }

  if (info.extra) {
    line += ` extra: ${inspect(info.extra, {
      depth: 100,
    })}`
  }

  return line
}

interface LogRecord {
  /** required type for log messages that will be indexed */
  type: string
  /** log message, defaults to `type` */
  message?: string
  /** keys that will be indexed as fields in the log record */
  meta?: Record<
    string,
    string | number | string[] | number[] | Date | undefined | null
  >
  /** extra data that will be stored with this log record but not indexed as fields */
  extra?: Record<string, unknown>
}

export class Logger {
  constructor(protected readonly winston: winston.Logger) {}

  debug(rec: LogRecord) {
    this.write('debug', rec)
  }

  info(rec: LogRecord) {
    this.write('info', rec)
  }

  warning(rec: LogRecord) {
    this.write('warn', rec)
  }

  error(rec: LogRecord) {
    this.write('error', rec)
  }

  private write(level: string, rec: LogRecord) {
    this.winston.log({
      level,
      type: rec.type,
      message: rec.message || rec.type,
      meta: rec.meta,
      extra: rec.extra,
    })
  }
}

export class CliLog extends Logger {
  constructor(level: 'info' | 'debug' | 'verbose') {
    super(
      winston.createLogger({
        level: level,
        format: winston.format.combine(
          winston.format.errors({
            stack: true,
          }),
        ),
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.printf(printLogEntry),
            ),
          }),
        ],
      }),
    )
  }
}

export class ServerLog extends Logger {
  constructor(es?: EsClient) {
    super(
      winston.createLogger({
        level: 'debug',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({
            stack: true,
          }),
          winston.format.json(),
        ),
        transports:
          process.env.NODE_ENV === 'test'
            ? [
                new winston.transports.Stream({
                  stream: new Writable({
                    objectMode: true,
                    write(msg, _, cb) {
                      if (process.env.ENABLE_TEST_LOGGING) {
                        /* eslint-disable-next-line no-console */
                        console.log(
                          `[${msg.level}][${msg['@type']}] ${msg.message}`,
                          inspect(msg.extra, { depth: 100 }),
                        )
                      }

                      cb()
                    },
                  }),
                }),
              ]
            : [
                new winston.transports.Console({
                  format: winston.format.combine(
                    // filter out request objects from the console
                    winston.format(info =>
                      process.env.NODE_ENV === 'production' &&
                      info.type === 'request' &&
                      info.meta.status < 400
                        ? false
                        : info,
                    )(),
                    winston.format.printf(printLogEntry),
                  ),
                }),
                ...(es
                  ? [
                      new ElasticsearchTransport({
                        level: 'debug',
                        index: 'kibana-ci-stats-logs',
                        ensureMappingTemplate: false,
                        flushInterval: 500,
                        transformer(event) {
                          const message: string = event.message
                          const level: string = event.level || 'info'
                          const {
                            type = `level:${level}`,
                            extra,
                            meta,
                          } = event.meta
                          const timestamp: string = event.timestamp!

                          return {
                            level,
                            type,
                            message,
                            timestamp,
                            meta,
                            // wrap extra in an array so it is rendered as a single row in Kibana
                            ...(extra ? { extra: [extra] } : {}),
                          }
                        },
                        client: es,
                        ...({ apm } as any),
                      }),
                    ]
                  : []),
              ],
      }),
    )
  }

  getRequestLogger(ctx: ReqContext) {
    return new Logger(
      this.winston.child({
        requestId: getRequestId(ctx),
      }),
    )
  }

  close() {
    this.winston.close()
  }
}

const reqLogCache = makeAutoCache((ctx: ReqContext) =>
  ctx.server.log.getRequestLogger(ctx),
)

export const getRequestLogger = reqLogCache.get

export function getTestLogger() {
  return new ServerLog()
}
