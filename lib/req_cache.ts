import { ReqContext } from '@spalger/micro-plus'

export function makeReqCache<V, T extends object = ReqContext>(
  name: string,
  factory?: (ctx: T) => V,
) {
  const cache = new WeakMap<T, V>()

  function has(ctx: T): boolean {
    return cache.has(ctx)
  }

  function assignValue(ctx: T, value: V): V {
    if (has(ctx)) {
      throw new Error(`${name} already assigned to req [${cache.get(ctx)}]`)
    }

    cache.set(ctx, value)
    return value
  }

  function autoAssignValue(ctx: T) {
    if (!factory) {
      throw new Error(
        'autoAssignValue() requires a factory function be defined',
      )
    }

    return assignValue(ctx, factory(ctx))
  }

  function get(ctx: T): V {
    if (!has(ctx)) {
      if (factory) {
        assignValue(ctx, factory(ctx))
      } else {
        throw new Error(`${name} not assigned to req`)
      }
    }

    return cache.get(ctx)!
  }

  return {
    get,
    assignValue,
    autoAssignValue,
    has,
  }
}
