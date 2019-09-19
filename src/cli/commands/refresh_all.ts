import Elasticsearch from '@elastic/elasticsearch'
import { runReactors, prReactors } from '../../reactors'
import { Log, GithubApi, SlackApi } from '../../lib'
import { CliError } from '../errors'

export async function runRefreshAllCommand(
  reactorId: string,
  log: Log,
  es: Elasticsearch.Client,
  githubApi: GithubApi,
  slackApi: SlackApi,
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
          slackApi,
          log,
          es,
          input: {
            action: 'refresh',
            pr,
          },
        },
      }),
    )
  }
}
