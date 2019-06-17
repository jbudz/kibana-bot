import { isAxiosErrorResp, Log } from '../../../lib'

export const retryOn404 = async <T>(log: Log, fn: () => T) => {
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
        log.warn('Github responded with a 404, retrying in 2 seconds', {
          '@type': 'github404Retry',
          attempt,
        })
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }

      throw error
    }
  }
}
