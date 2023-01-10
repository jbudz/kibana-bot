import micro from 'micro'

import { app } from './app'

const { handler, log } = app()

micro(handler)
  .listen(8000, () => {
    log.info('listening on port 8000')
  })
  .on('error', (error) => {
    log.error(error)
    process.exit(1)
  })
