import { broadcastMsgRoute } from './broadcast_msg'
import { helloWorldRoute } from './hello_world'
import { kibanaCiRoutes } from './kibana_ci'
import { refreshExpiredOutdatedRoute } from './refresh_expired_outdated'
import { sendBackportRemindersRoute } from './send_backport_reminders'
import { slackAuthCallbackRoute } from './slack_auth_callback'
import { webhookRoute } from './webhook_route'

export const routes = [
  broadcastMsgRoute,
  helloWorldRoute,
  ...kibanaCiRoutes,
  refreshExpiredOutdatedRoute,
  sendBackportRemindersRoute,
  slackAuthCallbackRoute,
  webhookRoute,
]
