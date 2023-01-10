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
  if (!reactorId) {
    throw new CliError('reactor id must be specified')
  }

  const ids = reactorId.split(',').map((id) => id.trim())
  const reactors = prReactors.filter((r) => ids.includes(r.id))
  if (!reactors.length) {
    throw new CliError('reactor id does not match any known reactors')
  }

  for await (const pr of githubApi.ittrAllOpenPrs()) {
    if (pr.draft) {
      continue
    }

    const outdated = await githubApi.getSpecificCommitStatus(
      pr.head.sha,
      'prbot:release note labels',
    )

    log.info(
      `PR #${pr.number} (sha: ${pr.head.sha}) "prbot:release note labels" status is ${outdated}`,
    )

    if (outdated !== 'EXPECTED' && outdated !== undefined) {
      continue
    }

    await runReactors(reactors, {
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
    })
    log.info(`✅ #${pr.number}`)
  }
}
