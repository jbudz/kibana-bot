import { GithubApiPullRequestFile } from '../github_api_types'

const fileStartsWith = (f: GithubApiPullRequestFile, startsWith: string) =>
  f.filename.startsWith(startsWith) &&
  (!f.previous_filename || f.previous_filename.startsWith(startsWith))

export function getIsDocsOnlyChange(files: GithubApiPullRequestFile[]) {
  return files.every(
    f => fileStartsWith(f, 'docs/') || fileStartsWith(f, 'rfcs/'),
  )
}
