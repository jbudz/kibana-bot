it('can be required without failing', () => {
  process.env.DIRECT_API_PASSWORD = 'foo'
  process.env.ES_URL = 'foo'
  process.env.GITHUB_SECRET = 'foo'
  process.env.GITHUB_WEBHOOK_SECRET = 'foo'
  process.env.REDIS_URL = 'foo'
  process.env.PUBLIC_REPO_URL = 'foo'
  process.env.SLACK_CLIENT_ID = 'foo'
  process.env.SLACK_CLIENT_SECRET = 'foo'
  process.env.SLACK_CREDS_PASSWORD = 'foo'
  process.env.SLACK_CREDS_INDEX = 'foo'

  require('./app')
})
