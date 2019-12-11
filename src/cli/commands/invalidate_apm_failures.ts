import gql from 'graphql-tag'

import { GithubApi, getIncludesApmChanges } from '../../lib'
import { GQLStatusState } from '../../github_api_types'

type QueryPage = {
  repository: {
    pullRequests: {
      nodes: Array<{
        number: number
        changedFiles: number
        files: {
          nodes: Array<{
            path: string
          }>
        }
        lastCommit: {
          nodes: Array<{
            commit: {
              oid: string
              status: {
                contexts: Array<{
                  context: string
                  state: GQLStatusState
                }>
              }
            }
          }>
        }
      }>
      pageInfo: {
        hasNextPage: boolean
        endCursor: string
      }
      rateLimit: {
        limit: number
        remaining: number
      }
    }
  }
}

const Query = gql`
  query($after: String) {
    repository(owner: "elastic", name: "kibana") {
      pullRequests(
        first: 10
        after: $after
        states: OPEN
        orderBy: { field: CREATED_AT, direction: DESC }
      ) {
        nodes {
          number
          changedFiles
          files(first: 100) {
            nodes {
              path
            }
          }
          lastCommit: commits(last: 1) {
            nodes {
              commit {
                oid
                status {
                  contexts {
                    context
                    state
                  }
                }
              }
            }
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
    rateLimit {
      cost
      limit
      remaining
    }
  }
`

async function* ittrFailedPrs(githubApi: GithubApi, failureContext: string) {
  const cursors: (string | null)[] = [null]

  while (cursors.length) {
    const after = cursors.shift()
    console.info(`fetching page with cursor [${after}]`)
    const {
      repository: { pullRequests: page },
    } = await githubApi.gql<QueryPage>(Query, { after })

    if (page.pageInfo.hasNextPage) {
      cursors.push(page.pageInfo.endCursor)
    }

    for (const pr of page.nodes) {
      const [lastCommit] = pr.lastCommit.nodes
      const { contexts = [] } = lastCommit.commit.status || {}
      const context = contexts.find(c => c.context === failureContext)

      if (context?.state !== 'FAILURE' && context?.state !== 'ERROR') {
        continue
      }

      if (pr.changedFiles > pr.files.nodes.length) {
        console.error(
          `⚠️  PR ${pr.number} has too many changed files = ${pr.changedFiles}`,
        )
        continue
      }

      yield {
        id: pr.number,
        sha: lastCommit.commit.oid,
        filePaths: pr.files.nodes.map(n => n.path),
      }
    }
  }
}

export async function runInvalidateApmFailuresCommand(githubApi: GithubApi) {
  const APM_CI_CONTEXT = 'apm-ci/end2end/pr-merge'

  for await (const pr of ittrFailedPrs(githubApi, APM_CI_CONTEXT)) {
    if (!getIncludesApmChanges(pr.filePaths)) {
      console.log(`pr #${pr.id}: invalidating failure`)
      await githubApi.setCommitStatus(pr.sha, {
        context: APM_CI_CONTEXT,
        state: 'success',
        description: `failure ignored because this PR doesn't contain apm changes`,
      })
    }
  }

  console.info('complete ✅')
}
