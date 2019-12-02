require('./dist/setup_env')
require('elastic-apm-node').start({
  centralConfig: false,
})
require('./dist/run_server')
