import { GithubApiPullRequestFile } from '../github_api_types'

const fileStartsWith = (f: GithubApiPullRequestFile, startsWith: string) =>
  f.filename.startsWith(startsWith) &&
  (!f.previous_filename || f.previous_filename.startsWith(startsWith))

const isDocs = (f: GithubApiPullRequestFile) => fileStartsWith(f, 'docs/')

const isRfc = (f: GithubApiPullRequestFile) => fileStartsWith(f, 'rfcs/')

export function getIsDocsOnlyChange(files: GithubApiPullRequestFile[]) {
  return files.every(f => isDocs(f) || isRfc(f))
}

export function getIsChangeIncludingDocs(files: GithubApiPullRequestFile[]) {
  return files.some(isDocs)
}
