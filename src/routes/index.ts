import { webhookRoute } from './webhook_route'
import { helloWorldRoute } from './hello_world'
import { refreshRoute } from './refresh'
import { refreshExpiredOutdatedRoute } from './refresh_expired_outdated'
import { refreshAllRoute } from './refresh_all'
import { ensureCiRoute } from './ensure_ci'

export const routes = [
  helloWorldRoute,
  webhookRoute,
  refreshRoute,
  refreshExpiredOutdatedRoute,
  refreshAllRoute,
  ensureCiRoute,
]
