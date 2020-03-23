import apm from 'elastic-apm-node'
import { Client } from '@elastic/elasticsearch'
import winston from 'winston'
import WinstonElasticsearch from 'winston-elasticsearch'

import { makeContextCache } from './req_cache'
import { getRequestId } from './req_id'

// filter out request objects from logs
const filterRequestType = winston.format((info: any) =>
  info.type === 'request' ? false : info,
)

export type Log = winston.Logger

export function createRootLog(es: Client | null): Log {
  return winston.createLogger({
    level: 'debug',
    defaultMeta: { service: 'prbot' },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({
        stack: true,
      }),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          filterRequestType(),
          winston.format.simple(),
        ),
      }),

      ...(es !== null && process.env.NODE_ENV === 'production'
        ? [
            new WinstonElasticsearch({
              index: 'kibana-bot-logs',
              ensureMappingTemplate: false,
              flushInterval: 500,
              transformer(event) {
                const message: string = event.message
                const level: string = event.level || 'info'
                const {
                  '@type': type = `level:${level}`,
                  extra,
                  ...restOfMeta
                } = event.meta
                const timestamp: string = event.timestamp!

                // prevent objects from being used in meta, move them to extra
                for (const key of Object.keys(restOfMeta)) {
                  if (
                    typeof restOfMeta[key] === 'object' &&
                    restOfMeta[key] !== null
                  ) {
                    extra[key] = restOfMeta[key]
                    restOfMeta[key] = undefined
                  }
                }

                return {
                  '@type': type,
                  '@level': level,
                  '@message': message,
                  '@timestamp': timestamp,
                  meta: restOfMeta,
                  // wrap extra in an array so they're rendered as a single row in Kibana
                  extra: [extra],
                }
              },
              client: es,
              ...({ apm } as any),
            }),
          ]
        : []),
    ],
  })
}

const rootLoggerCache = makeContextCache<Log>('root logger')
export const assignRootLogger = rootLoggerCache.assignValue

const reqLoggerCache = makeContextCache('logger', ctx =>
  rootLoggerCache.get(ctx).child({
    requestId: getRequestId(ctx),
  }),
)
export const getRequestLogger = reqLoggerCache.get
