import gql from 'graphql-tag'

import { GithubApi } from '../../lib'
import { GQLStatusState } from '../../github_api_types'

type QueryPage = {
  repository: {
    pullRequests: {
      nodes: Array<{
        number: number
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
          lastCommit: commits(last: 1) {
            nodes {
              commit {
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

async function* ittrPrs(githubApi: GithubApi) {
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
      yield {
        id: pr.number,
        statuses: Object.fromEntries(contexts.map(c => [c.context, c.state])),
      }
    }
  }
}

export async function runPrintDocStatusCommand(githubApi: GithubApi) {
  const ES_DOCS_CONTEXT = 'elasticsearch-ci/docs'

  for await (const pr of ittrPrs(githubApi)) {
    switch (pr.statuses[ES_DOCS_CONTEXT]) {
      case 'PENDING':
        console.info(`#${pr.id} pending`)
        continue
      case 'FAILURE':
        console.info(`#${pr.id} failure`)
        continue
      case 'SUCCESS':
        console.info(`#${pr.id} success`)
        continue
      default:
        console.info(`#${pr.id} no status`)
    }
  }

  console.info('complete ✅')
}
