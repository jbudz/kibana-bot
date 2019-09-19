import getopts from 'getopts'
import chalk from 'chalk'
import { getConfigVar } from '@spalger/micro-plus'

import { CliError } from './errors'
import { runPrintDocStatusCommand } from './commands/print_doc_status'
import { runPrintBaseBranchesCommand } from './commands/print_base_branches'
import { runRefreshCommand } from './commands/refresh'
import { runRefreshAllCommand } from './commands/refresh_all'
import { log, GithubApi, createRootClient } from '../lib'

const helpText = `
node cli [command] [...options]

CLI to run tasks on Kibana PRs

  Commands:
    help                     show this message
    print_doc_status         print the docs job status of each PR
    refresh [pr] [reactor]   run a specific reactor against a specific pr
    refresh_all [reactor]    run a specific reactor against all open prs
    print_base_branches      print the base branch of all open prs
`

export async function main() {
  try {
    const unknownFlagNames: string[] = []
    const argv = getopts(process.argv.slice(2), {
      unknown(name) {
        unknownFlagNames.push(name)
        return false
      },
    })

    if (unknownFlagNames.length) {
      throw new CliError(`unknown flag(s) ${unknownFlagNames.join(', ')}`, {
        showHelp: true,
      })
    }

    const [command] = argv._
    switch (command) {
      case 'print_doc_status': {
        const githubApi = new GithubApi(log, getConfigVar('GITHUB_SECRET'))
        await runPrintDocStatusCommand(githubApi)
        return
      }

      case 'print_base_branches': {
        const githubApi = new GithubApi(log, getConfigVar('GITHUB_SECRET'))
        await runPrintBaseBranchesCommand(githubApi)
        return
      }

      case 'refresh': {
        const [, prId, reactorId] = argv._
        const es = createRootClient(log)
        const githubApi = new GithubApi(log, getConfigVar('GITHUB_SECRET'))
        await runRefreshCommand(prId, reactorId, log, es, githubApi)
        return
      }

      case 'refresh_all': {
        const [, reactorId] = argv._
        const es = createRootClient(log)
        const githubApi = new GithubApi(log, getConfigVar('GITHUB_SECRET'))
        await runRefreshAllCommand(reactorId, log, es, githubApi)
        return
      }

      case 'help':
        throw new CliError('', {
          exitCode: 0,
          showHelp: true,
        })

      default:
        throw new CliError(
          command ? `unknown command [${command}]` : 'missing command',
          {
            showHelp: true,
          },
        )
    }
  } catch (error) {
    if (error instanceof CliError) {
      if (error.message) {
        console.error(chalk.red(error.message))
      }

      if (error.showHelp) {
        console.log(helpText)
      }

      process.exit(error.exitCode)
    }

    console.error(chalk.red('FATAL ERROR'))
    console.error(chalk.red(error.stack || error.message || error))
    process.exit(1)
  }
}
