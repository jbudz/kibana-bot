import micro from 'micro'

import { bootstrapGcpSecrets } from './lib/bootstrap_gcp_secrets'
import { app } from './app'

async function start() {
  try {
    await bootstrapGcpSecrets()
    const { handler, log } = app()

    micro(handler)
      .listen(8000, () => {
        log.info('listening on port 8000')
      })
      .on('error', error => {
        log.error(error)
        process.exit(1)
      })
  } catch (error) {
    console.error(error)
  }
}

start()
