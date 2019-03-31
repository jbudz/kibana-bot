interface RefObject {
//   "sha": "2bba845269c370dcf9275a5b26cde38533d3dd47",
  sha: string
//   "type": "commit",
  type: string
//   "url": "https://api.github.com/repos/spalger/test-repo/git/commits/2bba845269c370dcf9275a5b26cde38533d3dd47"
  url: string
}

export interface Ref {
  // "ref": "refs/heads/master",
  ref: string
  // "node_id": "MDM6UmVmMTc4NjQzNzMzOm1hc3Rlcg==",
  node_id: string
  // "url": "https://api.github.com/repos/spalger/test-repo/git/refs/heads/master",
  url: string
  // "object": {
  object: RefObject
  // }
}