interface CommitUser {
  //   "name": "Spencer",
  name: string
  //   "email": "email@spalger.com",
  email: string
  //   "date": "2019-03-30T04:05:24Z"
  date: string
}

export interface Commit {
  // "sha": "41e49cf93fe73583e04a3f74451164937f2a407b",
  sha: string
  // "node_id": "MDY6Q29tbWl0NzgzMzE2ODo0MWU0OWNmOTNmZTczNTgzZTA0YTNmNzQ0NTExNjQ5MzdmMmE0MDdi",
  node_id: string
  // "url": "https://api.github.com/repos/elastic/kibana/git/commits/41e49cf93fe73583e04a3f74451164937f2a407b",
  url: string
  // "html_url": "https://github.com/elastic/kibana/commit/41e49cf93fe73583e04a3f74451164937f2a407b",
  html_url: string
  author: CommitUser
  committer: CommitUser
  // "tree": {
  //   "sha": "d6cbb0fa177f4623acb9f19617e53f0833db18c3",
  //   "url": "https://api.github.com/repos/elastic/kibana/git/trees/d6cbb0fa177f4623acb9f19617e53f0833db18c3"
  // },
  // "message": "[yarn] upgrade geckodriver (#34216)",
  // "parents": [
  //   {
  //     "sha": "dbb80992abfd910d9e16062fb73500e90d6110c3",
  //     "url": "https://api.github.com/repos/elastic/kibana/git/commits/dbb80992abfd910d9e16062fb73500e90d6110c3",
  //     "html_url": "https://github.com/elastic/kibana/commit/dbb80992abfd910d9e16062fb73500e90d6110c3"
  //   }
  // ],
  // "verification": {
  //   "verified": true,
  //   "reason": "valid",
  //   "signature": "-----BEGIN PGP SIGNATURE-----\n\nwsBcBAABCAAQBQJcnusECRBK7hj4Ov3rIwAAdHIIAHUs4q806TTNl/K87jk4ffl1\nL2MgN8S1xqMO2yWc54NdjRH9R/BaJyZivtr9ZH5ZuT1sX+g1W5H97n8m15dE9niv\nDQBd5vSWGjBLNLtz35yE5f+ShMpSZl/5cbWAwPUQ+JAcxcDOgAK8EnppT1TOZuxb\nB/fDibvWML08FHML4yhTFlXdfQdNWnRQfMgCv3x1hHIcUaa4G60OUaEmMsIWQm0r\nA9/RAlcidNt64iYQlubquOqF07IN7FVcqLIvn+Vec8P8kqySLIqwYtSyLF4OTHKJ\nfnR53NkTWGFa0gkuLa62D3iTjPskDDf+0ioUZhiO6yBN/ysjOQ/zxIG/ZRfv+aM=\n=mwiU\n-----END PGP SIGNATURE-----\n",
  //   "payload": "tree d6cbb0fa177f4623acb9f19617e53f0833db18c3\nparent dbb80992abfd910d9e16062fb73500e90d6110c3\nauthor Spencer <email@spalger.com> 1553918724 -0700\ncommitter GitHub <noreply@github.com> 1553918724 -0700\n\n[yarn] upgrade geckodriver (#34216)\n\n"
  // }
}