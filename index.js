require('dotenv/config')
require('elastic-apm-node').start()
require('ts-node/register')
require('micro')(require('./app')).listen(8000, () => {
  console.log('listening on port 8000')
})
