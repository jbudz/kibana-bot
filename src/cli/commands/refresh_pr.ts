import Elasticsearch from '@elastic/elasticsearch'

import { Log, GithubApi } from '../../lib'
import { runReactors, prReactors } from '../../reactors'
import { CliError } from '../errors'

export async function runRefreshPrCommand(
  prId: string,
  reactorId: string,
  log: Log,
  es: Elasticsearch.Client,
  githubApi: GithubApi,
) {
  if (!prId) {
    throw new CliError('missing pr id', { showHelp: true })
  }
  if (typeof prId !== 'string' || !/^\d+$/.test(prId)) {
    throw new CliError('invalid pr id', { showHelp: true })
  }

  if (reactorId && typeof reactorId !== 'string') {
    throw new CliError('invalid reactor name param', { showHelp: true })
  }

  const pr = await githubApi.getPr(Number.parseInt(prId, 10))
  const body = await runReactors(
    prReactors.filter(r => !reactorId || r.id === reactorId),
    {
      context: {
        input: {
          action: 'refresh',
          pr,
        },
        githubApi,
        log,
        es,
      },
    },
  )

  log.info('✅ success', body)
}
