import axios from 'axios'
import { getConfigVar } from '@spalger/micro-plus'

import { getOutdatedPrs } from './github_prs'

const GITHUB_TOKEN = getConfigVar('GITHUB_TOKEN');

export async function findOldPRs() {
  const gql = axios.create({
    baseURL: 'https://api.github.com/graphql',
    headers: {
      'Accept': 'application/vnd.github.shadow-cat-preview',
      'User-Agent': '@kibanamachine/stale-pr-bot',
      'Authorization': `bearer ${GITHUB_TOKEN}`
    },
    method: 'POST',
    transformResponse(json) {
      const { data } = JSON.parse(json);

      if (data && data.rateLimit) {
        console.log('rate limit update: cost=%d remaining=%d', data.rateLimit.cost, data.rateLimit.remaining)
      }

      return data
    }
  });

  return await getOutdatedPrs(
    'elastic',
    'kibana',
    gql,
  );
}