/* eslint-disable @typescript-eslint/no-var-requires */

require('dotenv/config')
require('source-map-support/register')
require('elastic-apm-node').start()

const { app } = require('./app')

require('micro')(app())
  .listen(8000, () => {
    console.log('listening on port 8000')
  })
  .on('error', error => {
    console.error(error.stack || error.message || error)
    process.exit(1)
  })
