import Elasticsearch from '@elastic/elasticsearch'
import { runReactors, labelReactors } from '../../reactors'
import { Log, GithubApi } from '../../lib'
import { CliError } from '../errors'

export async function runRefreshAllLabelsCommand(
  log: Log,
  es: Elasticsearch.Client,
  githubApi: GithubApi,
  reactorId?: string,
) {
  const reactors = labelReactors.filter(reactor =>
    reactorId ? reactor.id === reactorId : true,
  )
  if (!reactors.length) {
    throw new CliError('reactor id does not match any known reactors')
  }

  for await (const label of githubApi.iterAllLabels()) {
    await runReactors(reactors, {
      context: {
        githubApi,
        log,
        es,
        input: {
          action: 'refresh',
          label,
        },
      },
    })
    log.info(`✅ ${label.name}`)
  }
}
