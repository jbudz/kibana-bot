import Fs from 'fs'
import Path from 'path'

import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

interface SecretValues {
  directApiPassword?: string
  esUrl?: string
  githubSecret?: string
  githubWebhookSecret?: string
  slackCredsIndex?: string
  slackClientId?: string
  slackClientSecret?: string
  slackCredsPassword?: string
  apmServiceName?: string
  apmSecretToken?: string
  apmServerUrl?: string
}

export class Secrets {
  static async load() {
    if (process.env.NODE_ENV === 'test') {
      return new Secrets({})
    }

    if (process.env.NODE_ENV === 'production') {
      return this.loadFromGcpSecretsManager()
    }

    return this.loadFromFile()
  }

  static async loadFromGcpSecretsManager() {
    const secrets = new SecretManagerServiceClient()

    const getSecret = async (uri: string) => {
      const [resp] = await secrets.accessSecretVersion({
        name: uri,
      })

      const value = resp.payload?.data?.toString()
      if (typeof value !== 'string') {
        throw new Error(`unable to load secret from uri: ${uri}`)
      }

      return value
    }

    return new Secrets({
      directApiPassword: await getSecret(
        'projects/261553193300/secrets/kibana-bot--directApiPassword/versions/1',
      ),
      esUrl: await getSecret(
        'projects/261553193300/secrets/kibana-bot--esUrl/versions/1',
      ),
      githubSecret: await getSecret(
        'projects/261553193300/secrets/kibana-bot--githubSecret/versions/1',
      ),
      githubWebhookSecret: await getSecret(
        'projects/261553193300/secrets/kibana-bot--githubWebhookSecret/versions/1',
      ),
      slackCredsIndex: await getSecret(
        'projects/261553193300/secrets/kibana-bot--slackCredsIndex/versions/1',
      ),
      slackClientId: await getSecret(
        'projects/261553193300/secrets/kibana-bot--slackClientId/versions/1',
      ),
      slackClientSecret: await getSecret(
        'projects/261553193300/secrets/kibana-bot--slackClientSecret/versions/1',
      ),
      slackCredsPassword: await getSecret(
        'projects/261553193300/secrets/kibana-bot--slackCredsPassword/versions/1',
      ),
      apmServiceName: await getSecret(
        'projects/261553193300/secrets/kibana-bot--apmServiceName/versions/1',
      ),
      apmSecretToken: await getSecret(
        'projects/261553193300/secrets/kibana-bot--apmSecretToken/versions/1',
      ),
      apmServerUrl: await getSecret(
        'projects/261553193300/secrets/kibana-bot--apmServerUrl/versions/1',
      ),
    })
  }

  static loadFromFile() {
    const secretsPath = Path.resolve(__dirname, '../secrets.json')
    let json = '{}'
    try {
      json = Fs.readFileSync(secretsPath, 'utf8')
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error
      }
    }

    let values
    try {
      values = JSON.parse(json)
    } catch (error) {
      throw new Error(`unable to parse [${secretsPath}] as json`)
    }

    return new Secrets(values)
  }

  public readonly directApiPassword?: string
  public readonly esUrl?: string
  public readonly githubSecret?: string
  public readonly githubWebhookSecret?: string
  public readonly slackCredsIndex?: string
  public readonly slackClientId?: string
  public readonly slackClientSecret?: string
  public readonly slackCredsPassword?: string
  public readonly apmServiceName?: string
  public readonly apmSecretToken?: string
  public readonly apmServerUrl?: string

  constructor(values: SecretValues) {
    this.directApiPassword = values.directApiPassword
    this.esUrl = values.esUrl
    this.githubSecret = values.githubSecret
    this.githubWebhookSecret = values.githubWebhookSecret
    this.slackCredsIndex = values.slackCredsIndex
    this.slackClientId = values.slackClientId
    this.slackClientSecret = values.slackClientSecret
    this.slackCredsPassword = values.slackCredsPassword
    this.apmServiceName = values.apmServiceName
    this.apmSecretToken = values.apmSecretToken
    this.apmServerUrl = values.apmServerUrl
  }

  get<T extends keyof SecretValues>(name: T): NonNullable<Secrets[T]> {
    const value = this[name]

    if (value === undefined) {
      throw new Error(`secrets.${name} is not defined`)
    }

    return value!
  }
}
