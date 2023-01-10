import gql from 'graphql-tag'

import { GithubApi, getIncludesApmChanges } from '../../lib'
import { GQLStatusState } from '../../github_api_types'

const filterMap = <T, T2>(arr: T[], fn: (a: T) => T2 | undefined): T2[] => {
  return Array.from(
    (function* () {
      for (const a of arr) {
        const val = fn(a)
        if (val !== undefined) {
          yield val
        }
      }
    })(),
  )
}

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
          pageInfo: {
            hasNextPage: boolean
            endCursor: string
          }
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
  query ($after: String) {
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
            pageInfo {
              endCursor
              hasNextPage
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

    const pageOfFails = page.nodes.filter((n) => {
      const [lastCommit] = n.lastCommit.nodes
      const { contexts = [] } = lastCommit.commit.status || {}
      const context = contexts.find((c) => c.context === failureContext)

      return context?.state === 'FAILURE' || context?.state === 'ERROR'
    })

    const extendedFilePathLists = await githubApi.getRestOfFiles(
      filterMap(pageOfFails, (pr) =>
        !pr.files.pageInfo.hasNextPage
          ? undefined
          : {
              id: pr.number,
              files: pr.files.nodes.map((f) => f.path),
              filesEndCursor: pr.files.pageInfo.endCursor,
            },
      ),
    )

    for (const n of pageOfFails) {
      const filePaths =
        extendedFilePathLists.get(n.number) || n.files.nodes.map((n) => n.path)
      yield {
        id: n.number,
        sha: n.lastCommit.nodes[0].commit.oid,
        filePaths,
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
