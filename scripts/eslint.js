const { parse } = require('eslint/lib/options')

const options = parse(process.argv)

if (!options._.length && !options.printConfig) {
  process.argv.push('.')
}

process.argv.push('--ext', 'js,ts,tsx')

if (!process.argv.includes('--no-cache')) {
  process.argv.push('--cache')
}

// common-js is required so that logic before this executes before loading eslint
require('eslint/bin/eslint')
