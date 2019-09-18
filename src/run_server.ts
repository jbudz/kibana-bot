import micro from 'micro'

import { log } from './lib'
import { app } from './app'

micro(app(log))
  .listen(8000, () => {
    log.info('listening on port 8000')
  })
  .on('error', error => {
    log.error(error)
    process.exit(1)
  })
