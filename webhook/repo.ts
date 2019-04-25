import Fs from 'fs'
import { dirname, basename } from 'path'

import { getConfigVar } from '@spalger/micro-plus'
import execa from 'execa'

import { Task } from './task'

const PUBLIC_REPO_URL = getConfigVar('PUBLIC_REPO_URL')

export class Repo {
  private readonly queue: Task<any>[] = []
  private running = false

  public constructor(private path: string) {}

  private run<T>(fn: () => Promise<T>) {
    const t = new Task(fn)
    this.queue.push(t)
    this.processQueue()
    return t.promise
  }

  private async processQueue() {
    if (this.running) {
      return
    }

    try {
      this.running = true
      while (this.queue.length) {
        const task = this.queue.shift()
        if (task) {
          await task.run()
        }
      }
      this.running = false
    } catch (error) {
      console.error('TASK ERROR')
      console.error(error.stack || error.message || error)
      process.exit(1)
    }
  }

  private initPromise?: Promise<void>
  public async init() {
    if (!this.initPromise) {
      this.initPromise = this.run(async () => {
        if (Fs.existsSync(this.path)) {
          console.log('Repository directory exists')
        } else {
          console.log('Running initial clone')
          await execa(
            'git',
            ['clone', '--bare', PUBLIC_REPO_URL, basename(this.path)],
            {
              cwd: dirname(this.path),
            },
          )
          console.log('Initial clone complete')
        }
      })
    }

    return await this.initPromise
  }

  public async fetchBranch(branch: string) {
    return await this.run(async () => {
      await execa('git', ['fetch', 'origin', branch], {
        cwd: this.path,
      })
    })
  }

  public async fetchPr(prNumber: number) {
    return await this.run(async () => {
      await execa('git', ['fetch', 'origin', `pull/${prNumber}/head`], {
        cwd: this.path,
      })
    })
  }
}
