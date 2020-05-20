import { Client } from '@elastic/elasticsearch'
import { scrollSearch, EsHit } from './es'
import { Log } from './log'

export class InvalidLabelLog {
  constructor(private readonly es: Client, private readonly log: Log) {}
  /**
   * Record that a PR received "failure" statuses for label reasons
   * so that we can check them in a little while
   */
  async add(prNumber: number) {
    await this.es.index({
      index: 'kibana-bot-invalid-labels-log',
      id: JSON.stringify(prNumber),
      body: {},
    })
  }

  /**
   * Iterate over the prs that were marked as having invalid labels and
   * handle them, deleting items as we go
   */
  async handleEach(handler: (prNumber: number) => Promise<void>) {
    // refresh the index to make sure we have the latest
    await this.es.indices.refresh({
      index: 'kibana-bot-invalid-labels-log',
    })

    // called after each item is handled so it can be deleted
    const handled = async (hit: EsHit<{}>) => {
      this.log.info(
        `handled and clearing "invalid label log" item [id=${hit._id}]`,
      )

      try {
        await this.es.delete({
          index: hit._index,
          id: hit._id,
        })
      } catch (error) {
        // noop
      }
    }

    // iterate over all items in the index
    const hitIter = scrollSearch<EsHit<{}>>(this.es, {
      index: 'kibana-bot-invalid-labels-log',
      body: {},
    })

    for await (const hit of hitIter) {
      let prId
      try {
        prId = JSON.parse(hit._id)
      } catch (error) {
        this.log.error(`unable to parse label log item [id=${hit._id}]`)
        await handled(hit)
        continue
      }

      try {
        await handler(prId)
      } catch (error) {
        this.log.error(`handler failed for item [id=${hit._id}]`, error)
      }

      await handled(hit)
    }
  }
}
