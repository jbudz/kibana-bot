require('./dist/setup_env')

const chalk = require('chalk')

require('./dist/cli')
  .main()
  .catch(error => {
    console.error(chalk.red('FATAL ERROR'))
    console.error(error)
    process.exit(1)
  })
