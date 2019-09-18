import { GithubApiPullRequestFile } from '../github_api_types'

const fileStartsWith = (
  f: string | GithubApiPullRequestFile,
  startsWith: string,
) =>
  typeof f === 'string'
    ? f.startsWith(startsWith)
    : f.filename.startsWith(startsWith) &&
      (!f.previous_filename || f.previous_filename.startsWith(startsWith))

const isDocs = (f: string | GithubApiPullRequestFile) =>
  fileStartsWith(f, 'docs/')

const isRfc = (f: string | GithubApiPullRequestFile) =>
  fileStartsWith(f, 'rfcs/')

export function getIsDocsOnlyChange(
  files: (string | GithubApiPullRequestFile)[],
) {
  return files.every(f => isDocs(f) || isRfc(f))
}

export function getIsChangeIncludingDocs(
  files: (string | GithubApiPullRequestFile)[],
) {
  return files.some(isDocs)
}
