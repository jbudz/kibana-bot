import { Logger } from './log'
import { isAxiosErrorResp } from './axios_errors'

export const retryOn404 = async <T>(log: Logger, fn: () => T) => {
  let attempt = 0

  while (true) {
    attempt += 1

    try {
      return await fn()
    } catch (error) {
      if (
        isAxiosErrorResp(error) &&
        error.response.status === 404 &&
        attempt <= 5
      ) {
        log.warning({
          type: 'github404Retry',
          message: 'Github responded with a 404, retrying in 2 seconds',
          meta: {
            attempt,
          },
        })
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2000, attempt)),
        )
        continue
      }

      throw error
    }
  }
}
