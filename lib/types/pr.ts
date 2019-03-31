
interface PrHeadBase {
  // "label": "elastic:master",
  // "ref": "master",
  ref: string
  // "sha": "852b6e9b1a81c79e0b3d598adffe2cc3e4eb9510",
  sha: string
  // "user": {
  //   "login": "elastic",
  //   "id": 6764390,
  //   "node_id": "MDEyOk9yZ2FuaXphdGlvbjY3NjQzOTA=",
  //   "avatar_url": "https://avatars0.githubusercontent.com/u/6764390?v=4",
  //   "gravatar_id": "",
  //   "url": "https://api.github.com/users/elastic",
  //   "html_url": "https://github.com/elastic",
  //   "followers_url": "https://api.github.com/users/elastic/followers",
  //   "following_url": "https://api.github.com/users/elastic/following{/other_user}",
  //   "gists_url": "https://api.github.com/users/elastic/gists{/gist_id}",
  //   "starred_url": "https://api.github.com/users/elastic/starred{/owner}{/repo}",
  //   "subscriptions_url": "https://api.github.com/users/elastic/subscriptions",
  //   "organizations_url": "https://api.github.com/users/elastic/orgs",
  //   "repos_url": "https://api.github.com/users/elastic/repos",
  //   "events_url": "https://api.github.com/users/elastic/events{/privacy}",
  //   "received_events_url": "https://api.github.com/users/elastic/received_events",
  //   "type": "Organization",
  //   "site_admin": false
  // },
  // "repo": {
  //   "id": 7833168,
  //   "node_id": "MDEwOlJlcG9zaXRvcnk3ODMzMTY4",
  //   "name": "kibana",
  //   "full_name": "elastic/kibana",
  //   "private": false,
  //   "owner": {
  //     "login": "elastic",
  //     "id": 6764390,
  //     "node_id": "MDEyOk9yZ2FuaXphdGlvbjY3NjQzOTA=",
  //     "avatar_url": "https://avatars0.githubusercontent.com/u/6764390?v=4",
  //     "gravatar_id": "",
  //     "url": "https://api.github.com/users/elastic",
  //     "html_url": "https://github.com/elastic",
  //     "followers_url": "https://api.github.com/users/elastic/followers",
  //     "following_url": "https://api.github.com/users/elastic/following{/other_user}",
  //     "gists_url": "https://api.github.com/users/elastic/gists{/gist_id}",
  //     "starred_url": "https://api.github.com/users/elastic/starred{/owner}{/repo}",
  //     "subscriptions_url": "https://api.github.com/users/elastic/subscriptions",
  //     "organizations_url": "https://api.github.com/users/elastic/orgs",
  //     "repos_url": "https://api.github.com/users/elastic/repos",
  //     "events_url": "https://api.github.com/users/elastic/events{/privacy}",
  //     "received_events_url": "https://api.github.com/users/elastic/received_events",
  //     "type": "Organization",
  //     "site_admin": false
  //   },
  //   "html_url": "https://github.com/elastic/kibana",
  //   "description": ":bar_chart: Kibana analytics and search dashboard for Elasticsearch",
  //   "fork": false,
  //   "url": "https://api.github.com/repos/elastic/kibana",
  //   "forks_url": "https://api.github.com/repos/elastic/kibana/forks",
  //   "keys_url": "https://api.github.com/repos/elastic/kibana/keys{/key_id}",
  //   "collaborators_url": "https://api.github.com/repos/elastic/kibana/collaborators{/collaborator}",
  //   "teams_url": "https://api.github.com/repos/elastic/kibana/teams",
  //   "hooks_url": "https://api.github.com/repos/elastic/kibana/hooks",
  //   "issue_events_url": "https://api.github.com/repos/elastic/kibana/issues/events{/number}",
  //   "events_url": "https://api.github.com/repos/elastic/kibana/events",
  //   "assignees_url": "https://api.github.com/repos/elastic/kibana/assignees{/user}",
  //   "branches_url": "https://api.github.com/repos/elastic/kibana/branches{/branch}",
  //   "tags_url": "https://api.github.com/repos/elastic/kibana/tags",
  //   "blobs_url": "https://api.github.com/repos/elastic/kibana/git/blobs{/sha}",
  //   "git_tags_url": "https://api.github.com/repos/elastic/kibana/git/tags{/sha}",
  //   "git_refs_url": "https://api.github.com/repos/elastic/kibana/git/refs{/sha}",
  //   "trees_url": "https://api.github.com/repos/elastic/kibana/git/trees{/sha}",
  //   "statuses_url": "https://api.github.com/repos/elastic/kibana/statuses/{sha}",
  //   "languages_url": "https://api.github.com/repos/elastic/kibana/languages",
  //   "stargazers_url": "https://api.github.com/repos/elastic/kibana/stargazers",
  //   "contributors_url": "https://api.github.com/repos/elastic/kibana/contributors",
  //   "subscribers_url": "https://api.github.com/repos/elastic/kibana/subscribers",
  //   "subscription_url": "https://api.github.com/repos/elastic/kibana/subscription",
  //   "commits_url": "https://api.github.com/repos/elastic/kibana/commits{/sha}",
  //   "git_commits_url": "https://api.github.com/repos/elastic/kibana/git/commits{/sha}",
  //   "comments_url": "https://api.github.com/repos/elastic/kibana/comments{/number}",
  //   "issue_comment_url": "https://api.github.com/repos/elastic/kibana/issues/comments{/number}",
  //   "contents_url": "https://api.github.com/repos/elastic/kibana/contents/{+path}",
  //   "compare_url": "https://api.github.com/repos/elastic/kibana/compare/{base}...{head}",
  //   "merges_url": "https://api.github.com/repos/elastic/kibana/merges",
  //   "archive_url": "https://api.github.com/repos/elastic/kibana/{archive_format}{/ref}",
  //   "downloads_url": "https://api.github.com/repos/elastic/kibana/downloads",
  //   "issues_url": "https://api.github.com/repos/elastic/kibana/issues{/number}",
  //   "pulls_url": "https://api.github.com/repos/elastic/kibana/pulls{/number}",
  //   "milestones_url": "https://api.github.com/repos/elastic/kibana/milestones{/number}",
  //   "notifications_url": "https://api.github.com/repos/elastic/kibana/notifications{?since,all,participating}",
  //   "labels_url": "https://api.github.com/repos/elastic/kibana/labels{/name}",
  //   "releases_url": "https://api.github.com/repos/elastic/kibana/releases{/id}",
  //   "deployments_url": "https://api.github.com/repos/elastic/kibana/deployments",
  //   "created_at": "2013-01-26T04:00:59Z",
  //   "updated_at": "2019-03-30T17:37:02Z",
  //   "pushed_at": "2019-03-31T04:16:13Z",
  //   "git_url": "git://github.com/elastic/kibana.git",
  //   "ssh_url": "git@github.com:elastic/kibana.git",
  //   "clone_url": "https://github.com/elastic/kibana.git",
  //   "svn_url": "https://github.com/elastic/kibana",
  //   "homepage": "https://www.elastic.co/products/kibana",
  //   "size": 726587,
  //   "stargazers_count": 11442,
  //   "watchers_count": 11442,
  //   "language": "JavaScript",
  //   "has_issues": true,
  //   "has_projects": true,
  //   "has_downloads": true,
  //   "has_wiki": true,
  //   "has_pages": false,
  //   "forks_count": 4479,
  //   "mirror_url": null,
  //   "archived": false,
  //   "open_issues_count": 4328,
  //   "license": {
  //     "key": "other",
  //     "name": "Other",
  //     "spdx_id": "NOASSERTION",
  //     "url": null,
  //     "node_id": "MDc6TGljZW5zZTA="
  //   },
  //   "forks": 4479,
  //   "open_issues": 4328,
  //   "watchers": 11442,
  //   "default_branch": "master"
  // }
}

interface PrUser {
  // "login": "mattkime",
  login: string
  // "id": 216176,
  id: number
  // "node_id": "MDQ6VXNlcjIxNjE3Ng==",
  node_id: string
  // "avatar_url": "https://avatars2.githubusercontent.com/u/216176?v=4",
  // "gravatar_id": "",
  // "url": "https://api.github.com/users/mattkime",
  // "html_url": "https://github.com/mattkime",
  // "followers_url": "https://api.github.com/users/mattkime/followers",
  // "following_url": "https://api.github.com/users/mattkime/following{/other_user}",
  // "gists_url": "https://api.github.com/users/mattkime/gists{/gist_id}",
  // "starred_url": "https://api.github.com/users/mattkime/starred{/owner}{/repo}",
  // "subscriptions_url": "https://api.github.com/users/mattkime/subscriptions",
  // "organizations_url": "https://api.github.com/users/mattkime/orgs",
  // "repos_url": "https://api.github.com/users/mattkime/repos",
  // "events_url": "https://api.github.com/users/mattkime/events{/privacy}",
  // "received_events_url": "https://api.github.com/users/mattkime/received_events",
  // "type": "User",
  // "site_admin": false
}

export interface Pr {
  // "url": "https://api.github.com/repos/elastic/kibana/pulls/32932",
  // "id": 260126269,
  id: number
  // "node_id": "MDExOlB1bGxSZXF1ZXN0MjYwMTI2MjY5",
  node_id: string
  // "html_url": "https://github.com/elastic/kibana/pull/32932",
  // "diff_url": "https://github.com/elastic/kibana/pull/32932.diff",
  // "patch_url": "https://github.com/elastic/kibana/pull/32932.patch",
  // "issue_url": "https://api.github.com/repos/elastic/kibana/issues/32932",
  // "number": 32932,
  number: number
  // "state": "open",
  state: 'open' | 'closed'
  // "locked": false,
  locked: boolean
  // "title": "Ci experiment",
  title: string
  user: PrUser
  // "body": "## Summary\r\n\r\nSummarize your PR. If it involves visual changes include a screenshot or gif.\r\n\r\n### Checklist\r\n\r\nUse ~~strikethroughs~~ to remove checklist items you don't feel are applicable to this PR.\r\n\r\n- [ ] This was checked for cross-browser compatibility, [including a check against IE11](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#cross-browser-compatibility)\r\n- [ ] Any text added follows [EUI's writing guidelines](https://elastic.github.io/eui/#/guidelines/writing), uses sentence case text and includes [i18n support](https://github.com/elastic/kibana/blob/master/packages/kbn-i18n/README.md)\r\n- [ ] [Documentation](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#writing-documentation) was added for features that require explanation or tutorials\r\n- [ ] [Unit or functional tests](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#cross-browser-compatibility) were updated or added to match the most common scenarios\r\n- [ ] This was checked for [keyboard-only and screenreader accessibility](https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Cross_browser_testing/Accessibility#Accessibility_testing_checklist)\r\n\r\n### For maintainers\r\n\r\n- [ ] This was checked for breaking API changes and was [labeled appropriately](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#release-notes-process)\r\n- [ ] This includes a feature addition or change that requires a release note and was [labeled appropriately](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#release-notes-process)\r\n\r\n",
  // "created_at": "2019-03-11T20:37:50Z",
  // "updated_at": "2019-03-31T04:16:11Z",
  // "closed_at": null,
  // "merged_at": null,
  // "merge_commit_sha": "f29fbdf25431ebe049a46cdbbc511e68bbb94a20",
  // "assignee": null,
  // "assignees": [],
  // "requested_reviewers": [],
  // "requested_teams": [],
  // "labels": [],
  // "milestone": null,
  // "commits_url": "https://api.github.com/repos/elastic/kibana/pulls/32932/commits",
  // "review_comments_url": "https://api.github.com/repos/elastic/kibana/pulls/32932/comments",
  // "review_comment_url": "https://api.github.com/repos/elastic/kibana/pulls/comments{/number}",
  // "comments_url": "https://api.github.com/repos/elastic/kibana/issues/32932/comments",
  // "statuses_url": "https://api.github.com/repos/elastic/kibana/statuses/1a00ff89855611b02c7942b81be7a48bb822586d",
  head: PrHeadBase,
  base: PrHeadBase,
  // "_links": {
  //   "self": {
  //     "href": "https://api.github.com/repos/elastic/kibana/pulls/32932"
  //   },
  //   "html": {
  //     "href": "https://github.com/elastic/kibana/pull/32932"
  //   },
  //   "issue": {
  //     "href": "https://api.github.com/repos/elastic/kibana/issues/32932"
  //   },
  //   "comments": {
  //     "href": "https://api.github.com/repos/elastic/kibana/issues/32932/comments"
  //   },
  //   "review_comments": {
  //     "href": "https://api.github.com/repos/elastic/kibana/pulls/32932/comments"
  //   },
  //   "review_comment": {
  //     "href": "https://api.github.com/repos/elastic/kibana/pulls/comments{/number}"
  //   },
  //   "commits": {
  //     "href": "https://api.github.com/repos/elastic/kibana/pulls/32932/commits"
  //   },
  //   "statuses": {
  //     "href": "https://api.github.com/repos/elastic/kibana/statuses/1a00ff89855611b02c7942b81be7a48bb822586d"
  //   }
  // },
  // "author_association": "MEMBER",
  // "draft": false
  draft: boolean
}