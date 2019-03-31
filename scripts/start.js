require('dotenv/config')
require('ts-node/register')
process.argv.splice(2, 1, require.resolve('../index.ts'))
require('micro/bin/micro')