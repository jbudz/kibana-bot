/* eslint-disable @typescript-eslint/no-var-requires */

require('dotenv/config')
require('source-map-support/register')
require('elastic-apm-node').start()

const { log } = require('./lib')
const { app } = require('./app')

require('micro')(app(log))
  .listen(8000, () => {
    log.info('listening on port 8000')
  })
  .on('error', error => {
    log.error(error.stack || error.message || error)
    process.exit(1)
  })
