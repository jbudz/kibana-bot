/**
 * MEMBER: Author is a member of the organization that owns the repository.
 * OWNER: Author is the owner of the repository.
 * COLLABORATOR: Author has been invited to collaborate on the repository.
 * CONTRIBUTOR: Author has previously committed to the repository.
 * FIRST_TIME_CONTRIBUTOR: Author has not previously committed to the repository.
 * FIRST_TIMER: Author has not previously committed to GitHub.
 * NONE: Author has no association with the repository.
 */
export type GithubAuthorAssociation =
  | 'MEMBER'
  | 'OWNER'
  | 'COLLABORATOR'
  | 'CONTRIBUTOR'
  | 'FIRST_TIME_CONTRIBUTOR'
  | 'FIRST_TIMER'
  | 'NONE'
