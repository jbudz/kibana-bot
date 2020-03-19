export interface GithubLabel {
  id: number
  node_id: string
  url: string
  name: string
  /** hex code without # */
  color: string
  default: boolean
}
