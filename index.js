require('dotenv').config()
require('source-map-support').install()
require('elastic-apm-node').start()

require('./dist/run_server')
