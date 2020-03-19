import Elasticsearch from '@elastic/elasticsearch'

import { Log, GithubApi } from '../../lib'
import { runReactors, issueReactors } from '../../reactors'
import { CliError } from '../errors'

export async function runRefreshIssueCommand(
  issueId: string,
  reactorId: string,
  log: Log,
  es: Elasticsearch.Client,
  githubApi: GithubApi,
) {
  if (!issueId) {
    throw new CliError('missing issue id', { showHelp: true })
  }
  if (typeof issueId !== 'string' || !/^\d+$/.test(issueId)) {
    throw new CliError('invalid issue id', { showHelp: true })
  }

  if (reactorId && typeof reactorId !== 'string') {
    throw new CliError('invalid reactor name param', { showHelp: true })
  }

  const issue = await githubApi.getIssue(Number.parseInt(issueId, 10))
  const body = await runReactors(
    issueReactors.filter(r => !reactorId || r.id === reactorId),
    {
      context: {
        input: {
          action: 'refresh',
          issue,
        },
        githubApi,
        log,
        es,
      },
    },
  )

  log.info('✅ success', body)
}
