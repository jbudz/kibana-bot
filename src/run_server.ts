import micro from 'micro'

import { bootstrapGcpSecrets } from './lib/bootstrap_gcp_secrets'
import { app } from './app'

const PORT = process.env.PORT || 8000

async function start() {
  try {
    await bootstrapGcpSecrets()
    const { handler, log } = app()

    await new Promise((resolve, reject) => {
      micro(handler)
        .listen(PORT, () => {
          log.info(`listening on port ${PORT}`)
        })
        .on('error', reject)
        .on('close', resolve)
    })
  } catch (error) {
    console.error(error)
    process.exit(1)
  }

  process.exit(0)
}

start()
