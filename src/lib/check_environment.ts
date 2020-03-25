import { getConfigVar } from '@spalger/micro-plus'

const REQUIRED_CONFIGS = [
  'DIRECT_API_PASSWORD',
  'ES_URL',
  'GITHUB_WEBHOOK_SECRET',
]

export function checkEnvironment() {
  REQUIRED_CONFIGS.forEach(getConfigVar)
}
