import { SecretManagerServiceClient, v1 } from '@google-cloud/secret-manager'
import { createRootLog } from './log'

const log = createRootLog(null)

export const GCP_SECRET_MAPPING: Record<string, string> = {
  DIRECT_API_PASSWORD: 'kibana-bot-test-secret',
  GITHUB_WEBHOOK_SECRET: 'kibana-bot-test-secret',
  ES_URL: 'kibana-bot-test-secret-url',
}

const getSecret = async (client: v1.SecretManagerServiceClient, id: string) => {
  const [accessResponse] = await client.accessSecretVersion({
    name: `projects/261553193300/secrets/${id}/versions/latest`,
  })

  return accessResponse?.payload?.data?.toString()
}

export async function bootstrapGcpSecrets() {
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  const client = new SecretManagerServiceClient()
  const envVars = Object.keys(GCP_SECRET_MAPPING).filter(
    key => !(key in process.env),
  )

  try {
    const values = await Promise.all(
      envVars.map(key => getSecret(client, GCP_SECRET_MAPPING[key])),
    )

    for (let i = 0; i < envVars.length; i++) {
      process.env[envVars[i]] = values[i]
    }
  } catch (ex) {
    log.error('Error bootstrapping secrets from GCP', ex)
    process.exit(1)
  }
}
