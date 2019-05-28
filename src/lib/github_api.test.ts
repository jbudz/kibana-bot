jest.mock('@spalger/micro-plus/lib/config', () => ({
  getConfigVar: jest.fn(key => {
    if (key === 'LOGS_DIR') {
      return '/dev/null'
    }
  }),
}))

import winston from 'winston'
import TransportStream from 'winston-transport'

import { GithubApi } from './github_api'

const logHistory = []
const log = winston.createLogger({
  level: 'debug',
  defaultMeta: { service: 'prbot' },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({
      stack: true,
    }),
    winston.format.json(),
  ),
  transports: [
    new TransportStream({
      log(log, cb) {
        logHistory.push(log)
        cb()
      },
    }),
  ],
})

afterEach(() => {
  logHistory.length = 0
})

it('calls to github', async () => {
  const api = new GithubApi(log, 'foo-bar')
  const req = ((api as any).req = jest.fn(async () => ({
    data: { pr: true },
  })))
  await expect(api.getPr(1234)).resolves.toMatchInlineSnapshot(`
                    Object {
                      "pr": true,
                    }
                `)
  expect(req.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "get",
        "/repos/elastic/kibana/pulls/1234",
        undefined,
      ],
    ]
  `)
})
