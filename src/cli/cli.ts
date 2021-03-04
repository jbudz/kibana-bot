import getopts from 'getopts'
import chalk from 'chalk'
import { getConfigVar } from '@spalger/micro-plus'

import { CliError } from './errors'
import { runPrintStatusCommand } from './commands/print_status'
import { runInvalidateApmFailuresCommand } from './commands/invalidate_apm_failures'
import { runPrintBaseBranchesCommand } from './commands/print_base_branches'
import { runRefreshPrCommand } from './commands/refresh_pr'
import { runRefreshAllPrsCommand } from './commands/refresh_all_prs'
import { runRefreshIssueCommand } from './commands/refresh_issue'
import { runRefreshAllIssuesCommand } from './commands/refresh_all_issues'
import { runBackportStateCommand } from './commands/backport_state'
import { runRefreshAllLabelsCommand } from './commands/refresh_all_labels'
import { createRootLog, GithubApi, createRootClient } from '../lib'

const helpText = `
node cli [command] [...options]

CLI to run tasks on Kibana PRs

  Commands:
    help                           show this message
    refresh_issue [num] [reactor]  run a specific reactor against a specific issue
    refresh_all_issues [reactor]   run a specific reactor against all open issues
    refresh_pr [pr] [reactor]      run a specific reactor against a specific pr
    refresh_all_prs [reactor]      run a specific reactor against all open prs
    refresh_all_labels <reactor>   run one or all reactors against all labels
    print_base_branches            print the base branch of all open prs
    print_pr_status [context]      print the specific status of each PR
      --only-failures, -f            Only print failure statuses
    backport_state [pr]            print the backport state of a PR

  Options:
    --dry-run                      don't commit the change, only output the result
`

export async function main() {
  try {
    const log = createRootLog(null)
    const unknownFlagNames: string[] = []
    const argv = getopts(process.argv.slice(2), {
      boolean: ['only-failures', 'dry-run'],
      alias: {
        f: 'only-failures',
      },
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

    const getAPI = () => {
      const dry = !!argv['dry-run']
      return new GithubApi(log, getConfigVar('GITHUB_SECRET'), dry)
    }

    const getESClient = () => {
      const dry = !!argv['dry-run']
      return createRootClient(log, dry)
    }

    const [command] = argv._

    switch (command) {
      case 'print_pr_status': {
        const [, context] = argv._
        const githubApi = getAPI()
        await runPrintStatusCommand(githubApi, context, {
          onlyFailures: !!argv['only-failures'],
        })
        return
      }

      case 'invalidate_apm_ci_failures': {
        const githubApi = getAPI()
        await runInvalidateApmFailuresCommand(githubApi)
        return
      }

      case 'print_base_branches': {
        const githubApi = getAPI()
        await runPrintBaseBranchesCommand(githubApi)
        return
      }

      case 'refresh_pr': {
        const [, prId, reactorId] = argv._
        const es = getESClient()
        const githubApi = getAPI()
        await runRefreshPrCommand(prId, reactorId, log, es, githubApi)
        return
      }

      case 'refresh_all_prs': {
        const [, reactorId] = argv._
        const es = getESClient()
        const githubApi = getAPI()
        await runRefreshAllPrsCommand(reactorId, log, es, githubApi)
        return
      }

      case 'refresh_issue': {
        const [, prId, reactorId] = argv._
        const es = getESClient()
        const githubApi = getAPI()
        await runRefreshIssueCommand(prId, reactorId, log, es, githubApi)
        return
      }

      case 'refresh_all_issues': {
        const [, reactorId] = argv._
        const es = getESClient()
        const githubApi = getAPI()
        await runRefreshAllIssuesCommand(reactorId, log, es, githubApi)
        return
      }

      case 'backport_state': {
        const [, prIdInput] = argv._
        const githubApi = getAPI()
        await runBackportStateCommand(githubApi, {
          prIdInput,
        })
        return
      }

      case 'refresh_all_labels': {
        const [, reactorId] = argv._
        const es = getESClient()
        const githubApi = getAPI()
        await runRefreshAllLabelsCommand(log, es, githubApi, reactorId)
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
