import { GithubApiPullRequestFile } from '../github_api_types'

const fileStartsWith = (
  f: string | GithubApiPullRequestFile,
  startsWith: string,
) =>
  typeof f === 'string'
    ? f.startsWith(startsWith)
    : f.filename.startsWith(startsWith) &&
      (!f.previous_filename || f.previous_filename.startsWith(startsWith))

const fileEndsWith = (f: string | GithubApiPullRequestFile, endsWith: string) =>
  typeof f === 'string'
    ? f.endsWith(endsWith)
    : f.filename.endsWith(endsWith) &&
      (!f.previous_filename || f.previous_filename.endsWith(endsWith))

const isDocs = (f: string | GithubApiPullRequestFile) =>
  fileStartsWith(f, 'docs/')

const isMarkdown = (f: string | GithubApiPullRequestFile) =>
  fileEndsWith(f, '.md')

export function getIsDocsOnlyChange(
  files: (string | GithubApiPullRequestFile)[],
) {
  return files.every(f => isDocs(f) || isMarkdown(f))
}

export function getIncludesDocsSiteChanges(
  files: (string | GithubApiPullRequestFile)[],
) {
  return files.some(isDocs)
}
