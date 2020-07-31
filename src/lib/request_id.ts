import * as Uuid from 'uuid'

import { makeAutoCache } from './auto_cache'

const requestIdCache = makeAutoCache(() => Uuid.v4())
export const getRequestId = requestIdCache.get
