import { CombinedCommitStatus } from '../github_api_types'

export function getCommitStatus(
  combinedStatus: CombinedCommitStatus,
  context: string,
) {
  const status = combinedStatus.statuses.find((s) => s.context === context)
  return status ? status.state : undefined
}
