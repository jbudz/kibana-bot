import { webhookRoute } from './webhook_route'
import { helloWorldRoute } from './hello_world'
import { refreshRoute } from './refresh'
import { refreshExpiredOutdatedRoute } from './refresh_expired_outdated'
import { refreshAllRoute } from './refresh_all'

export const routes = [
  helloWorldRoute,
  webhookRoute,
  refreshRoute,
  refreshExpiredOutdatedRoute,
  refreshAllRoute,
]
