import getopts from 'getopts'
import chalk from 'chalk'

import { Secrets } from '../secrets'
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
import {
  CliLog,
  GithubApi,
  EsClient,
  setupEsClientLogging,
  Config,
} from '../lib'
import { ReactorContext } from '../reactors'

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
      --only-failurgetEsClient(), -f            Only print failure statuses
    backport_state [pr]            print the backport state of a PR
`

export async function main() {
  try {
    const log = new CliLog('debug')
    const unknownFlagNames: string[] = []
    const secrets = Secrets.loadFromFile()
    const config = Config.load({
      ...secrets,
    })
    const argv = getopts(process.argv.slice(2), {
      boolean: ['only-failures'],
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

    const getGithubApi = () => {
      return new GithubApi(log, secrets.get('githubSecret'))
    }

    const getReactorContext = (): ReactorContext => {
      const es = new EsClient({
        node: secrets.get('esUrl'),
      })
      setupEsClientLogging(es, log)

      return {
        es,
        githubApi: getGithubApi(),
        config,
        log,
      }
    }

    const [command] = argv._
    switch (command) {
      case 'print_pr_status': {
        const [, context] = argv._
        await runPrintStatusCommand(getGithubApi(), context, {
          onlyFailures: !!argv['only-failures'],
        })
        return
      }

      case 'invalidate_apm_ci_failures': {
        await runInvalidateApmFailuresCommand(getGithubApi())
        return
      }

      case 'print_base_branches': {
        await runPrintBaseBranchesCommand(getGithubApi())
        return
      }

      case 'refresh_pr': {
        const [, prId, reactorId] = argv._
        await runRefreshPrCommand(prId, reactorId, getReactorContext())
        return
      }

      case 'refresh_all_prs': {
        const [, reactorId] = argv._
        await runRefreshAllPrsCommand(reactorId, getReactorContext())
        return
      }

      case 'refresh_issue': {
        const [, prId, reactorId] = argv._
        await runRefreshIssueCommand(prId, reactorId, getReactorContext())
        return
      }

      case 'refresh_all_issues': {
        const [, reactorId] = argv._
        await runRefreshAllIssuesCommand(reactorId, getReactorContext())
        return
      }

      case 'backport_state': {
        const [, prIdInput] = argv._
        await runBackportStateCommand(getGithubApi(), {
          prIdInput,
        })
        return
      }

      case 'refresh_all_labels': {
        const [, reactorId] = argv._
        await runRefreshAllLabelsCommand(reactorId, getReactorContext())
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
