import { has } from './utils'

function numberFromEnv(name: string, defaultValue: number) {
  const input = process.env[name]

  if (!input || !has(process.env, name)) {
    return defaultValue
  }

  if (typeof input === 'number') {
    return input
  }

  const parsed = parseInt(input, 10)
  if (isNaN(parsed)) {
    throw new TypeError(`invalid process.env.${name}, expected a number`)
  }

  return parsed
}

interface ConfigVars {
  port: number
  directApiPassword?: string
  esUrl?: string
  githubSecret?: string
  githubWebhookSecret?: string
  slackCredsIndex?: string
  slackClientId?: string
  slackClientSecret?: string
  slackCredsPassword?: string
}

const defaults: ConfigVars = {
  port: 8000,
}

export class Config implements ConfigVars {
  static forTesting(overrides?: Partial<ConfigVars>) {
    return new Config({
      ...defaults,
      directApiPassword: 'changeme',
      esUrl: 'http://esurl',
      ...overrides,
    })
  }

  static load(settings?: Partial<ConfigVars>) {
    return new Config({
      port: numberFromEnv('PORT', defaults.port),
      ...settings,
    })
  }

  public readonly port: number
  public readonly directApiPassword?: string
  public readonly esUrl?: string
  public readonly githubSecret?: string
  public readonly githubWebhookSecret?: string
  public readonly slackCredsIndex?: string
  public readonly slackClientId?: string
  public readonly slackClientSecret?: string
  public readonly slackCredsPassword?: string

  constructor(vars: ConfigVars) {
    this.port = vars.port || defaults.port
    this.directApiPassword = vars.directApiPassword
    this.esUrl = vars.esUrl
    this.githubSecret = vars.githubSecret
    this.githubWebhookSecret = vars.githubWebhookSecret
    this.slackCredsIndex = vars.slackCredsIndex
    this.slackClientId = vars.slackClientId
    this.slackClientSecret = vars.slackClientSecret
    this.slackCredsPassword = vars.slackCredsPassword
  }

  get<T extends keyof ConfigVars>(name: T): NonNullable<Config[T]> {
    const value = this[name]

    if (value === undefined) {
      throw new Error(`config.${name} is not defined`)
    }

    return value!
  }
}
