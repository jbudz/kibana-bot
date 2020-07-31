import 'source-map-support/register'
import apm from 'elastic-apm-node'
import { Secrets } from './secrets'

Secrets.load()
  .then(async secrets => {
    if (process.env.NODE_ENV === 'production' && secrets.apmSecretToken) {
      apm.start({
        centralConfig: true,
        serviceName: secrets.get('apmServiceName'),
        secretToken: secrets.get('apmSecretToken'),
        serverUrl: secrets.get('apmServerUrl'),
        logUncaughtExceptions: true,
        usePathAsTransactionName: true,
      })
    }

    const { Config, Server } = await import('./lib')
    const { routes } = await import('./routes')

    const config = Config.load({})
    const server = new Server(config, routes)

    await server.start()
  })
  .catch(error => {
    /* eslint-disable-next-line no-console */
    console.error(error)
    process.exit(1)
  })
