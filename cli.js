/* eslint-disable @typescript-eslint/no-var-requires */

require('@babel/register')({
  extensions: ['.ts'],
  cache: true,
})

require('./src/setup_env')

const chalk = require('chalk')

require('./src/cli')
  .main()
  .catch(error => {
    console.error(chalk.red('FATAL ERROR'))
    console.error(error)
    process.exit(1)
  })
