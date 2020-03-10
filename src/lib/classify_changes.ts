import { GithubApiPullRequestFile } from '../github_api_types'

type File = string | GithubApiPullRequestFile

const fileMatch = (f: File, test: (p: string) => boolean) =>
  typeof f === 'string'
    ? test(f)
    : test(f.filename) && (!f.previous_filename || test(f.previous_filename))

const fileStartsWith = (f: File, startsWith: string) =>
  fileMatch(f, p => p.startsWith(startsWith))

const fileIncludes = (f: File, includes: string) =>
  fileMatch(f, p => p.includes(includes))

const fileEndsWith = (f: File, endsWith: string) =>
  fileMatch(f, p => p.endsWith(endsWith))

const isDocs = (f: File) => fileStartsWith(f, 'docs/')
const isApm = (f: File) => fileIncludes(f, '/apm/')
const isMarkdown = (f: File) => fileEndsWith(f, '.md')
const isGithubConfig = (f: File) => fileStartsWith(f, '.github/')
const isJjbbConfig = (f: File) =>
  fileStartsWith(f, '.ci/') && fileEndsWith(f, '.yml')

export const getIncludesDocsSiteChanges = (files: File[]) => files.some(isDocs)
export const getIncludesApmChanges = (files: File[]) => files.some(isApm)
export const getIsDocsOnlyChange = (files: File[]) =>
  files.every(f => isDocs(f) || isMarkdown(f))
export const getIsConfigOnlyChange = (files: File[]) =>
  files.every(f => isGithubConfig(f) || isJjbbConfig(f))
