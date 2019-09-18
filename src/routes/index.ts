import { webhookRoute } from './webhook_route'
import { helloWorldRoute } from './hello_world'
import { refreshExpiredOutdatedRoute } from './refresh_expired_outdated'

export const routes = [
  helloWorldRoute,
  webhookRoute,
  refreshExpiredOutdatedRoute,
]
