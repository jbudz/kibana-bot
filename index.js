/* eslint-disable @typescript-eslint/no-var-requires */

require('dotenv/config')
require('elastic-apm-node').start()
require('ts-node/register')

const { repo, microHandler } = require('./app')

require('micro')(microHandler)
  .listen(8000, () => {
    console.log('listening on port 8000')
  })
  .on('error', error => {
    console.error(error.stack || error.message || error)
    process.exit(1)
  })

repo.init().catch(error => {
  console.error(error.stack || error.message || error)
  process.exit(1)
})
