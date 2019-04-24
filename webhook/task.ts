export class Task<T> {
  public readonly promise: Promise<T>
  public readonly run: () => Promise<void>

  public constructor(fn: () => Promise<T>) {
    let resolve: (arg: T) => void
    let reject: (err: Error) => void

    this.promise = new Promise<T>((_resolve, _reject) => {
      resolve = _resolve
      reject = _reject
    })

    this.run = () =>
      Promise.resolve()
        .then(fn)
        .then(resolve, reject)
  }
}
