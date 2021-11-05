import Elasticsearch from '@elastic/elasticsearch'
import { runReactors, issueReactors } from '../../reactors'
import { Log, GithubApi } from '../../lib'
import { CliError } from '../errors'

export async function runRefreshAllIssuesCommand(
  reactorId: string,
  log: Log,
  es: Elasticsearch.Client,
  githubApi: GithubApi,
) {
  const reactor = issueReactors.find(reactor => reactor.id === reactorId)
  if (!reactor) {
    throw new CliError('reactor id does not match any known reactors')
  }

  for await (const issue of githubApi.ittrAllOpenIssues()) {
    await runReactors([reactor], {
      context: {
        githubApi,
        log,
        es,
        input: {
          action: 'refresh',
          issue,
        },
      },
    })
    log.info(`✅ #${issue.number}`)
  }
}
