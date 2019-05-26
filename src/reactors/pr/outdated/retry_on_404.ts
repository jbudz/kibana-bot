import { isAxiosErrorResp } from '../../../lib'

export const retryOn404 = async <T>(fn: () => T) => {
  let attempt = 0

  while (true) {
    attempt += 1

    try {
      return await fn()
    } catch (error) {
      if (
        isAxiosErrorResp(error) &&
        error.response.status === 404 &&
        attempt < 3
      ) {
        console.warn(
          'Github responded with a 404, waiting 2 seconds and retrying [attempt=%d]',
          attempt,
        )
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }

      if (isAxiosErrorResp(error)) {
        console.error(
          'GITHUB API ERROR RESPONSE:\n  attempt: %d\n  url: %s\n  status: %s\n  data: %j',
          attempt,
          error.request.url,
          `${error.response.status} - ${error.response.statusText}`,
          error.response.data,
        )
      }

      throw error
    }
  }
}
