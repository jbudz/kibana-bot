import Elasticsearch from '@elastic/elasticsearch'
import { runReactors, prReactors } from '../../reactors'
import { Log, GithubApi } from '../../lib'
import { CliError } from '../errors'

export async function runRefreshAllPrsCommand(
  reactorId: string,
  log: Log,
  es: Elasticsearch.Client,
  githubApi: GithubApi,
) {
  const reactor = prReactors.find(reactor => reactor.id === reactorId)
  if (!reactor) {
    throw new CliError('reactor id does not match any known reactors')
  }

  for await (const pr of githubApi.ittrAllOpenPrs()) {
    log.info(
      `✅ #${pr.number}`,
      await runReactors([reactor], {
        context: {
          githubApi,
          log,
          es,
          input: {
            action: 'refresh',
            pr,
            prFromApi: true,
          },
        },
      }),
    )
  }
}
