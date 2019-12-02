import { webhookRoute } from './webhook_route'
import { helloWorldRoute } from './hello_world'
import { refreshExpiredOutdatedRoute } from './refresh_expired_outdated'
import { slackAuthCallbackRoute } from './slack_auth_callback'

export const routes = [
  helloWorldRoute,
  webhookRoute,
  refreshExpiredOutdatedRoute,
  slackAuthCallbackRoute,
]
