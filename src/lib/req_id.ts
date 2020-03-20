import * as Uuid from 'uuid'

import { makeContextCache } from './req_cache'

const requestIdCache = makeContextCache('requestId', () => Uuid.v4())
export const getRequestId = requestIdCache.get
