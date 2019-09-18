export class CliError {
  constructor(
    public readonly message: string,
    private readonly options: {
      exitCode?: number
      showHelp?: boolean
    } = {},
  ) {}

  get exitCode() {
    return this.options.exitCode === undefined ? 1 : this.options.exitCode
  }

  get showHelp() {
    return this.options.showHelp === undefined ? false : this.options.showHelp
  }
}
