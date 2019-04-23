export const multiMemoize = <A, T, C>(context: C, fn: (context: C, arg: A[]) => Promise<T[]>) => {
  const cache = new Map<A, Promise<T>>()
  
  type Defer = ReturnType<typeof makeDefer>
  type Need = { arg: A, defer: Defer }

  const makeDefer = () => {
    let resolve: (value: T) => void
    let reject: (error: Error) => void
    const promise = new Promise<T>((_resolve, _reject) => {
      resolve = _resolve
      reject = _reject
    })
    return { promise, resolve: resolve!, reject: reject! }
  }

  const get = (needs: Need[]) => {
    fn(context, needs.map(r => r.arg)).then(results => {
      results.forEach((r, i) => {
        needs[i].defer.resolve(r)
      })
    }, (error) => {
      needs.forEach(r => {
        r.defer.reject(error)
      })
    })
  }

  return (args: A[]) => {
    const needs: Need[] = []
    const result = args.map(arg => {
      if (!cache.has(arg)) {
        const defer = makeDefer()
        needs.push({ arg, defer })
        cache.set(arg, defer.promise)
      }
  
      return cache.get(arg)!
    })
    
    if (needs.length) {
      get(needs)
    }

    return Promise.all(result)
  }
}