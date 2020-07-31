import { Client as EsClient } from '@elastic/elasticsearch'

import { Logger } from './log'
import { isObj } from './utils'

export { EsClient }
export type EsHit<T> = {
  _index: string
  _id: string
  _score?: number
  _source: T
}

export function setupEsClientLogging(es: EsClient, log: Logger) {
  es.on('response', (error: unknown) => {
    if (isObj(error) && isObj(error.meta)) {
      const { body, statusCode, headers, warnings } = error.meta as {
        body: unknown
        statusCode?: number
        headers: unknown
        warnings: unknown
      }

      log.error({
        type: 'esError',
        extra: {
          body,
          statusCode,
          headers,
          warnings,
        },
      })
    } else if (error) {
      /* eslint-disable-next-line no-console */
      console.error('UNKNOWN ES ERROR')
      /* eslint-disable-next-line no-console */
      console.error(error)
    }
  })
}

export async function getOldestMissingCommitDate(es: EsClient, sha: string) {
  const resp = await es.get(
    {
      index: 'prbot-commit-times',
      id: sha,
    },
    {
      ignore: [404],
    },
  )

  if (!resp.body.found) {
    return undefined
  }

  return new Date(resp.body._source.pushTime)
}

export async function recordCommitStatus(
  es: EsClient,
  prNumber: number,
  sha: string,
  commitStatusOptions: { [key: string]: any },
) {
  const url = `https://api.github.com/repos/elastic/kibana/statuses/${encodeURIComponent(
    sha,
  )}`

  await es.index({
    index: 'prbot-commit-status-sets',
    id: sha,
    body: {
      url,
      '@timestamp': new Date(),
      prNumber,
      ...commitStatusOptions,
    },
  })
}

export async function* scrollSearch<T extends EsHit<any>>(
  es: EsClient,
  params: any,
) {
  const page1 = await es.search<any>({
    scroll: '1m',
    ...params,
  })
  let remaining = page1.body.hits.total
  let scrollId = page1.body._scroll_id
  const oldScrollIds = new Set<string>()

  interface Body {
    _scroll_id: string
    hits: { hits: T[] }
  }

  function* yieldPage(page: { body: Body }) {
    oldScrollIds.add(scrollId)
    scrollId = page.body._scroll_id

    for (const hit of page.body.hits.hits) {
      yield hit
      remaining -= 1
    }
  }

  try {
    yield* yieldPage(page1)
    while (remaining > 0) {
      yield* yieldPage(
        await es.scroll({
          scroll: '1m',
          scroll_id: scrollId,
        }),
      )
    }
  } finally {
    try {
      if (oldScrollIds.size) {
        await es.clearScroll({
          scroll_id: [...oldScrollIds],
        })
      }
    } catch (error) {
      // ignore
    }
  }
}
