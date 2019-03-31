require('dotenv/config')
require('ts-node/register')
require('micro')(require('./index')).listen(8000)
