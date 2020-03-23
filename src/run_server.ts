import micro from 'micro'

import { log } from './lib/log'
import { bootstrapGcpSecrets } from './lib/bootstrap_gcp_secrets'

async function start() {
  try {
    await bootstrapGcpSecrets()

    micro(require('./app').app(log))
      .listen(8000, () => {
        log.info('listening on port 8000')
      })
      .on('error', error => {
        log.error(error)
        process.exit(1)
      })
  } catch (error) {
    log.error(error)
    process.exit(1)
  }
}

start()
