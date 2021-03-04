import { Client, ClientOptions } from '@elastic/elasticsearch'
import Mock from '@elastic/elasticsearch-mock'
import { getConfigVar } from '@spalger/micro-plus'

import { Log } from './log'
import { makeContextCache } from './req_cache'

export type EsHit<T> = {
  _index: string
  _id: string
  _score?: number
  _source: T
}

export function logEsClientReponseErrors(es: Client, log: Log) {
  es.on('response', (error: any) => {
    if (error && error.meta) {
      const { body, statusCode, headers, warnings } = error.meta as {
        body: unknown
        statusCode?: number
        headers: unknown
        warnings: unknown
      }

      log.error('ES ERROR', {
        '@type': 'esError',
        extra: {
          body,
          statusCode,
          headers,
          warnings,
        },
      })
    } else if (error) {
      console.error('UNKNOWN ES ERROR')
      console.error(error)
    }
  })
}

export function createRootClient(log: Log | null, dryRun = false) {
  const config: ClientOptions = {
    node: getConfigVar('ES_URL'),
  }

  if (dryRun) {
    const mock = new Mock()
    config.Connection = mock.getConnection()
    mock.add(
      {
        method: ['GET', 'POST', 'HEAD', 'PUT'],
        path: '*',
      },
      () => {
        return { status: 'ok' }
      },
    )
  }

  const es = new Client(config)

  if (log !== null) {
    logEsClientReponseErrors(es, log)
  }

  return es
}

const cache = makeContextCache<Client>('es client')
export const assignEsClient = cache.assignValue
export const getEsClient = cache.get

export async function getOldestMissingCommitDate(es: Client, sha: string) {
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
  es: Client,
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
  es: Client,
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
