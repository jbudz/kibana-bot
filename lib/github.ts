import axios, { AxiosResponse } from 'axios'
import { getConfigVar, HOUR, ServerError } from '@spalger/micro-plus'

import { parseLinkHeader } from './links'
import { memoize } from './memoize'

import { Pr } from './types/pr'
import { Commit } from './types/commit'
import { Ref } from './types/ref'

const GITHUB_TOKEN = getConfigVar('GITHUB_TOKEN');

export async function findOldPRs() {
  const api = axios.create({
    baseURL: 'https://api.github.com/repos/elastic/kibana/',
    headers: {
      'Accept': 'application/vnd.github.shadow-cat-preview',
      'User-Agent': '@kibanamachine/pr-bot',
      'Authorization': `token ${GITHUB_TOKEN}`
    }
  });

  const getCommitDate = memoize(async (sha: string) => {
    console.log('Getting commit date', sha);
    const resp = await api.get(`git/commits/${encodeURIComponent(sha)}`)
    const commit: Commit = resp.data;
    const authorTime = new Date(commit.author.date);
    const committerTime = new Date(commit.committer.date);
    return authorTime > committerTime ? authorTime : committerTime;
  })

  const masterRef: Ref = (await api.get('git/refs/heads/master')).data
  const masterCommitDate = await getCommitDate(masterRef.object.sha);
  async function handleResponse(prs: Pr[]) {
    return Promise.all(prs.map(async pr => {
      if (pr.draft) {
        return
      }
  
      const getBaseCommitDate = await getCommitDate(pr.base.sha);
      let msSinceMaster = masterCommitDate.valueOf() - getBaseCommitDate.valueOf()
      if (msSinceMaster > 24 * HOUR) {
        return pr
      }
    }))
  }

  console.log('fetching first page of PRs');

  const queue: Array<AxiosResponse<Pr[]>> = [
    await api.get('pulls', {
      params: {
        state: 'open',
        base: 'master',
        sort: 'updated',
        direction: 'desc'
      }
    })
  ];

  const processing: Promise<{ prs: Pr[] } | { error: any }>[] = [];

  while (queue.length) {
    const resp = queue.shift()!;

    processing.push(
      handleResponse(resp.data).then(
        (prs) => ({
          prs: prs.filter((pr): pr is Pr => !!pr)
        }),
        (error) => ({
          error
        })
      )
    )

    const links = parseLinkHeader(resp.headers.link);
    if (links.next) {
      console.log('fetching next page', links.next)
      queue.push(await axios.get(links.next))
    }
  }

  const errors: Error[] = []
  const stalePrs: Pr[] = [];

  for (const result of await Promise.all(processing)) {
    if ('prs' in result) {
      for (const pr of result.prs) {
        stalePrs.push(pr)
      } 
    } else {
      errors.push(result.error)
    }
  }

  if (errors.length) {
    throw new ServerError(
      `${errors.length} errors:\n  ${errors.map(e => e.stack).join('\n\n  ')}`
    )
  }

  return {
    stalePrs: stalePrs.length
  }
}