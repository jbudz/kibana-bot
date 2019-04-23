import { AxiosInstance } from 'axios'
import { HOUR } from '@spalger/micro-plus'

import { multiMemoize } from './memoize'
import { getCommits } from './github_commits'
import { maxDate } from './date'

type StatusState = 'FAILURE' | 'SUCCESS' | 'PENDING' | null

const QUERY = `
query ($org: String!, $repo: String!, $cursor: String, $headRefName: String) {
  repository(owner: $org, name: $repo) {
    pullRequests(states: OPEN, first: 100, orderBy: {field: UPDATED_AT, direction: ASC}, after: $cursor, headRefName: $headRefName) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        url
        commits(last:1) {
          nodes {
            commit {
              sha: oid
              status {
                context(name:"kibana-ci") {
                  state
                }
              }
            }
          }
        }
        baseSha: baseRefOid
        upstream: baseRef {
          name
          target {
            ... on Commit {
              authoredDate
              committedDate
            }
          }
        }
      }
    }
  }
  rateLimit {
    cost
    remaining
  }
}
`

interface PrsResponseNode {
  url: string
  commits: {
    nodes: [{
      commit: {
        sha: string,
        status?: {
          context?: {
            state: StatusState
          }
        }
      }
    }]
  },
  baseSha: string
  upstream: {
    name: string
    target: {
      authoredDate: string
      committedDate: string
    }
  }
}

interface PrsResponse {
  repository: {
    pullRequests: {
      pageInfo: {
        endCursor: string
        hasNextPage: boolean
      },
      nodes: PrsResponseNode[]
    }
  }
}

export interface Pr {
  url: string
  headSha: string
  headStatusState: StatusState,
  expectedHeadStatusState: StatusState,
  baseName: string
  baseDate: Date
  upstreamDate: Date
}

const flatMap = <I, O>(arr: I[], fn: (item: I, i: number) => O[]) => {
  return arr.map(fn).reduce((acc, os) => acc.concat(os), [])
}

/**
 * Get the stale PRs for org/repo
 * @param gql instance of axios, preped to send graphql with authorization and everything except request body
 * @param getCommitsForShas 
 * @param cursor 
 */
export async function getOutdatedPrs(
  org: string,
  repo: string,
  gql: AxiosInstance,
) {
  const memoizedGetCommits = multiMemoize(gql, getCommits)

  async function fetch(cursor?: string): Promise<Pr[]> {
    console.log('fetching PRs:', cursor ? 'cursor=' + cursor : 'first page');

    const { data } = await gql.request<PrsResponse>({
      data: {
        query: QUERY,
        variables: {
          org,
          repo,
          cursor,
          headRefName: 'test/stale-pr-bot'
        }
      }
    })

    const { pageInfo, nodes: prResps } = data.repository.pullRequests;
    const [rest, baseCommits] = await Promise.all([
      pageInfo.hasNextPage ? fetch(pageInfo.endCursor) : [],
      memoizedGetCommits(prResps.map(prResp => prResp.baseSha))
    ] as [
      ReturnType<typeof fetch>,
      ReturnType<typeof memoizedGetCommits>
    ])

    return [
      ...flatMap(prResps, (prResp, i) => {
        const baseCommit = baseCommits[i];

        if ('error' in baseCommit) {
          console.error('ERROR LOADING BASE COMMIT:', baseCommit.error.message);
          return []
        }

        const headCommit = prResp.commits.nodes[0].commit;

        const upstreamDate = maxDate(
          prResp.upstream.target.authoredDate,
          prResp.upstream.target.committedDate
        )

        debugger;

        const expectedHeadStatusState: StatusState = ((upstreamDate.valueOf() - baseCommit.date.valueOf()) > HOUR * 48)
          ? 'FAILURE'
          : 'SUCCESS'

        const pr: Pr = {
          url: prResp.url,
          headSha: headCommit.sha,
          expectedHeadStatusState,
          headStatusState: headCommit.status && headCommit.status.context
            ? headCommit.status.context.state
            : null,
          baseName: prResp.upstream.name,
          baseDate: baseCommit.date,
          upstreamDate
        };

        return pr.expectedHeadStatusState !== pr.headStatusState ? [pr] : []
      }),
      ...rest
    ]
  }

  return await fetch()
}