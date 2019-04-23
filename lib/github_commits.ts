import { AxiosInstance } from 'axios'
import { NotFoundError } from '@spalger/micro-plus'

import { maxDate } from './date'

export interface Commit {
  sha: string,
  date: Date,
}

interface CommitError {
  sha: string,
  error: Error
}

export const getCommits = async (gql: AxiosInstance, shas: string[]): Promise<Array<Commit | CommitError>> => {
  console.log('fetching commit info for %d shas', shas.length)

  const resp = await gql.request({
    data: {
      query: `
        query {
          repository(owner: "elastic", name:"kibana") {
            ${
              shas.map((sha, i) => (
                // try to introduce some sanity into this dynamic graphql query by only
                // sending requests for shas that are valid hexidecimal
                /^[0-9a-f]+$/i.test(sha)
                  ? `commit_${i}: object(oid: "${sha}") { ...commentFields }`
                  : ''
              )).join('\n            ')
            }
          }
          rateLimit {
            cost,
            remaining
          }
        }

        fragment commentFields on Commit {
          authoredDate
          committedDate
        }
      `
    }
  })
  
  const commitResponses = resp.data.repository;

  return shas.map((sha: string, i: number) => {
    const commit = commitResponses[`commit_${i}`];
    if (!commit) {
      return {
        sha,
        error: new NotFoundError(`no commit found with sha ${sha}`)
      }
    }

    return {
      sha,
      date: maxDate(commit.authoredDate, commit.committedDate),
    }
  })
}