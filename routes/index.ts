import { webhookRoute } from './webhook_route'
import { helloWorldRoute } from './hello_world'
import { refreshAllRoute } from './refresh_all'
import { refreshRoute } from './refresh'

export const routes = [
  helloWorldRoute,
  webhookRoute,
  refreshAllRoute,
  refreshRoute,
]
