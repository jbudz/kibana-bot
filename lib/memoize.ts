export const memoize = <A, T>(fn: (arg: A) => T) => {
  const cache = new Map<A, T>()
  
  return (arg: A) => {
    if (!cache.has(arg)) {
      cache.set(arg, fn(arg));
    }
    
    return cache.get(arg)!
  }
}