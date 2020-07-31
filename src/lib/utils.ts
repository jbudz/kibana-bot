export function has<T extends Record<string, any>>(
  obj: T,
  key: string | number | symbol,
): key is keyof T {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

export function includes<T>(array: Array<T>, item: any): item is T {
  return array.includes(item)
}

export function isObj(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null
}
