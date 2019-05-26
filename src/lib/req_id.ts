import uuid from 'uuid/v4'

import { makeContextCache } from './req_cache'

const requestIdCache = makeContextCache('requestId', () => uuid())
export const getRequestId = requestIdCache.get
