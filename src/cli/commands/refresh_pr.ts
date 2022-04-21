import Elasticsearch from '@elastic/elasticsearch'

import { Log, GithubApi } from '../../lib'
import { runReactors, prReactors } from '../../reactors'
import { CliError } from '../errors'

function filterReactors(filter?: string) {
  if (!filter) {
    return prReactors
  }

  const ids = filter.split(',').map(id => id.trim())
  return prReactors.filter(r => ids.includes(r.id))
}

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
  await runReactors(filterReactors(reactorId), {
    context: {
      input: {
        action: 'refresh',
        pr,
        prFromApi: true,
      },
      githubApi,
      log,
      es,
    },
  })

  log.info('✅ success')
}
