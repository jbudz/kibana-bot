export function makeAutoCache<Key extends Record<any, any>, Value>(
  factory: (key: Key) => Value,
) {
  const cache = new WeakMap<Key, Value>()

  function has(key: Key): boolean {
    return cache.has(key)
  }

  function get(key: Key): Value {
    if (!cache.has(key)) {
      cache.set(key, factory(key))
    }

    return cache.get(key)!
  }

  function assign(key: Key, value: Value) {
    if (cache.has(key)) {
      throw new Error('value already defined')
    }

    cache.set(key, value)
  }

  return {
    get,
    assign,
    has,
  }
}
