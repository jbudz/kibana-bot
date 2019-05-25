import { ReqContext } from '@spalger/micro-plus'

export function makeContextCache<V>(
  name: string,
  factory?: (ctx: ReqContext) => V,
) {
  const cache = new WeakMap<ReqContext, V>()

  function has(ctx: ReqContext): boolean {
    return cache.has(ctx)
  }

  function assignValue(ctx: ReqContext, value: V): V {
    if (has(ctx)) {
      throw new Error(`${name} already assigned to req [${cache.get(ctx)}]`)
    }

    cache.set(ctx, value)
    return value
  }

  function autoAssignValue(ctx: ReqContext) {
    if (!factory) {
      throw new Error(
        'autoAssignValue() requires a factory function be defined',
      )
    }

    return assignValue(ctx, factory(ctx))
  }

  function get(ctx: ReqContext): V {
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
