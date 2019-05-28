import { StubReqContext } from '@spalger/micro-plus/lib/stub_req_context'
import { requireDirectApiPassword } from './direct_api_password'

const routeHandler = requireDirectApiPassword(() => ({
  body: 'success',
}))

it('rejects when request does not have Authorization header', async () => {
  await expect(
    routeHandler(new StubReqContext()),
  ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`)
})

it('rejects when request has incorrect password does not have Authorization header', async () => {
  const auth = Buffer.from('user:foo', 'utf8').toString('base64')

  await expect(
    routeHandler(
      new StubReqContext('/', {
        headers: {
          authorization: `basic ${auth}`,
        },
      }),
    ),
  ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`)
})

it('rejects when not using basic auth', async () => {
  await expect(
    routeHandler(
      new StubReqContext('/', {
        headers: {
          authorization: `token my-token`,
        },
      }),
    ),
  ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`)
})

it('succeeds when request has correct password', async () => {
  const auth = Buffer.from('user:foo-bar', 'utf8').toString('base64')

  await expect(
    routeHandler(
      new StubReqContext('/', {
        headers: {
          authorization: `basic ${auth}`,
        },
      }),
    ),
  ).resolves.toMatchInlineSnapshot(`
          Object {
            "body": "success",
          }
        `)
})
