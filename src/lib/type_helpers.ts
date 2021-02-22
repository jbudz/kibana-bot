export function isObj(input: any): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null
}
