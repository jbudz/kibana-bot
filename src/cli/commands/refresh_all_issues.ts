import { runReactors, issueReactors, ReactorContext } from '../../reactors'
import { CliError } from '../errors'

export async function runRefreshAllIssuesCommand(
  reactorId: string,
  context: ReactorContext,
) {
  const { log, githubApi } = context

  const reactor = issueReactors.find(reactor => reactor.id === reactorId)
  if (!reactor) {
    throw new CliError('reactor id does not match any known reactors')
  }

  for await (const issue of githubApi.ittrAllOpenIssues()) {
    log.info({
      type: 'run reactors',
      message: `✅ #${issue.number}`,
      extra: await runReactors([reactor], {
        context,
        input: {
          action: 'refresh',
          issue,
        },
      }),
    })
  }
}
