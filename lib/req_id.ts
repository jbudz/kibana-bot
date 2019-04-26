import uuid from 'uuid/v4'

import { makeReqCache } from './req_cache'

const requestIdCache = makeReqCache('requestId', () => uuid())
export const getRequestId = requestIdCache.get
