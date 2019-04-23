require('dotenv/config')
const { getConfigVar } = require('@spalger/micro-plus')

require('elastic-apm-node').start({
  // Override service name from package.json
  // Allowed characters: a-z, A-Z, 0-9, -, _,
  // and space
  serviceName: getConfigVar('APM_SERVICE_NAME'),

  // Use if APM Server requires a token
  secretToken: getConfigVar('APM_SECRET'),

  // Set custom APM Server URL
  // Default: http://localhost:8200
  serverUrl: getConfigVar('APM_SERVER_URL'),
})

require('ts-node/register')
require('micro')(require('./app')).listen(8000, () => {
  console.log('listening on port 8000')
})
