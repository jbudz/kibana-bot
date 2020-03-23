import { resolve } from 'path'

import winston from 'winston'
import * as Transport from 'winston-transport'
import { getConfigVar } from '@spalger/micro-plus'

import { makeContextCache } from './req_cache'
import { getRequestId } from './req_id'

const KILOB = 1000
const MEGAB = 1000 * KILOB

// filter out request objects from logs
const filterRequestType = winston.format((info: any) =>
  info.type === 'request' ? false : info,
)

const getTransports = (): Transport[] => {
  const transports: Transport[] = []

  if (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test'
  ) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          filterRequestType(),
          winston.format.simple(),
        ),
      }),
    )
  } else if (process.env.LOG_TO_CONSOLE) {
    transports.push(new winston.transports.Console())
  } else {
    transports.push(
      new winston.transports.File({
        filename: resolve(getConfigVar('LOGS_DIR'), 'prbot.log'),
        maxsize: 5 * MEGAB,
        maxFiles: 5,
      }),
    )
  }

  return transports
}

export type Log = winston.Logger
export const log = winston.createLogger({
  level: 'debug',
  defaultMeta: { service: 'prbot' },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({
      stack: true,
    }),
    winston.format.json(),
  ),
  transports: getTransports(),
})

const rootLoggerCache = makeContextCache<Log>('root logger')
export const getRootLogger = rootLoggerCache.get
export const assignRootLogger = rootLoggerCache.assignValue

const reqLoggerCache = makeContextCache('logger', ctx =>
  rootLoggerCache.get(ctx).child({
    requestId: getRequestId(ctx),
  }),
)
export const getRequestLogger = reqLoggerCache.get
