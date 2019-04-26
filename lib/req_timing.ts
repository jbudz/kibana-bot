import { IncomingMessage } from 'http'
import { makeReqCache } from './req_cache'

const startTimeCache = makeReqCache<number, IncomingMessage>('start time', () =>
  Date.now(),
)
export const getStartTime = startTimeCache.get
export const initStartTime = startTimeCache.autoAssignValue
