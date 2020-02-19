import { webhookRoute } from './webhook_route'
import { helloWorldRoute } from './hello_world'
import { refreshExpiredOutdatedRoute } from './refresh_expired_outdated'
import { slackAuthCallbackRoute } from './slack_auth_callback'
import { broadcastMsgRoute } from './broadcast_msg'
import { sendBackportRemindersRoute } from './send_backport_reminders'

export const routes = [
  helloWorldRoute,
  webhookRoute,
  refreshExpiredOutdatedRoute,
  slackAuthCallbackRoute,
  broadcastMsgRoute,
  sendBackportRemindersRoute,
]
