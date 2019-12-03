/**
 * Ported from https://github.com/alanshaw/abortable-iterator/blob/d1f1762de7b07051954d5de4928cf2eb54890002/index.js
 *
 * MIT License
 *
 * Copyright (c) 2018 Alan Shaw
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { AbortSignal } from 'abort-controller'
import { IterInput } from './convert'
import { asAsyncIterable } from './convert'

const IS_ABORT_ERROR = Symbol('isAbortError')

/**
 * Special error class that is intianiated and thrown when an abortable
 * async iterable is aborted.
 */
export class AbortError extends Error {
  [IS_ABORT_ERROR] = true
  code = 'ABORT_ERROR'

  constructor() {
    super('The operation was aborted')
  }
}

/**
 * Determine if the value `x`, which probably is being caught in a try/catch
 * is an AbortError, indicating that a `for await` or iteration of an abortable
 * async iterable was aborted.
 *
 * @param x any value
 */
export const isAbortError = (x: any): x is AbortError => {
  return x && typeof x === 'object' && IS_ABORT_ERROR in x
}

/**
 * Convert an async iterable that can be aborted with a standard `AbortSignal` (received
 * by creating an `AbortController`, using its `.signal` property)
 *
 * @param iter Any async iterable
 * @param signal An AbortSignal
 */
export async function* makeAbortable<T>(
  iter: IterInput<T>,
  signal: AbortSignal,
) {
  const iterable = asAsyncIterable(iter)
  let abortListener: () => void
  const aborted = new Promise<never>((_, reject) => {
    abortListener = () => {
      reject(new AbortError())
    }
    signal.addEventListener('abort', abortListener)
  })

  while (true) {
    let result: IteratorResult<T>
    try {
      if (signal.aborted) {
        throw new AbortError()
      }

      // Race the iterable and the abort signals
      result = await Promise.race([aborted, iterable.next()])
    } catch (error) {
      if (typeof iterable.return === 'function') {
        await iterable.return()
      }

      throw error
    }

    if (result.done) {
      break
    }

    yield result.value
  }

  signal.removeEventListener('abort', abortListener!)
}
