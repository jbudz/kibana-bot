import gql from 'graphql-tag'

import { GithubApi } from '../../lib'

type QueryPage = {
  repository: {
    pullRequests: {
      nodes: Array<{
        number: number
        baseRefName: string
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
          baseRefName
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
      yield pr
    }
  }
}

export async function runPrintBaseBranchesCommand(githubApi: GithubApi) {
  for await (const pr of ittrPrs(githubApi)) {
    console.log(`#${pr.number} ${pr.baseRefName}`)
  }
}
