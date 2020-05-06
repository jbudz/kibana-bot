import { Readable } from 'stream'

import { ReqContext } from '@spalger/micro-plus'

import { assignRootLogger, createTestRootLog } from './log'
import { parseBody } from './parse_body'

interface Body {
  strField: string
  optionalStr?: string
  numField: number
  objs: Array<{ foo: number }>
}

const rootLogger = createTestRootLog()

function makeReqContext(body: any) {
  const bodyStream = new Readable({
    read() {
      this.push(typeof body === 'string' ? body : JSON.stringify(body))
      this.push(null)
    },
  })

  const ctx = new ReqContext('/foo', 'GET', {}, bodyStream as any)
  assignRootLogger(ctx, rootLogger)
  return ctx
}

it('throws if extra fields are defined', async () => {
  await expect(
    parseBody<Pick<Body, 'strField'>>(
      makeReqContext({
        strField: 'string',
        unknownKey: true,
      }),
      fields => ({
        strField: fields.string('strField'),
      }),
    ),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"unexpected fields in body: unknownKey"`,
  )
})

it('validates properly formatted body', async () => {
  await expect(
    parseBody<Body>(
      makeReqContext({
        strField: 'string',
        numField: 1,
        objs: [{ foo: 1 }, { foo: 2 }],
      }),
      fields => ({
        strField: fields.string('strField'),
        numField: fields.number('numField'),
        optionalStr: fields.optionalString('optionalStr'),
        objs: fields.arrayOfObjects('objs', f => ({
          foo: f.number('foo'),
        })),
      }),
    ),
  ).resolves.toMatchInlineSnapshot(`
    Object {
      "numField": 1,
      "objs": Array [
        Object {
          "foo": 1,
        },
        Object {
          "foo": 2,
        },
      ],
      "optionalStr": undefined,
      "strField": "string",
    }
  `)
})

describe('number field', () => {
  it('throws if string is sent', async () => {
    await expect(
      parseBody<Pick<Body, 'numField'>>(
        makeReqContext({
          numField: 'foo',
        }),
        fields => ({
          numField: fields.number('numField'),
        }),
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"\`body.numField\` property must be a number"`,
    )
  })

  it('throws if array of numbers is sent', async () => {
    await expect(
      parseBody<Pick<Body, 'numField'>>(
        makeReqContext({
          numField: [1],
        }),
        fields => ({
          numField: fields.number('numField'),
        }),
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"\`body.numField\` property must be a number"`,
    )
  })

  it('throws if numbers is sent as string', async () => {
    await expect(
      parseBody<Pick<Body, 'numField'>>(
        makeReqContext({
          numField: '1',
        }),
        fields => ({
          numField: fields.number('numField'),
        }),
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"\`body.numField\` property must be a number"`,
    )
  })
})

describe('string field', () => {
  it('throws if string is number', async () => {
    await expect(
      parseBody<Pick<Body, 'strField'>>(
        makeReqContext({
          strField: 1,
        }),
        fields => ({
          strField: fields.string('strField'),
        }),
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"\`body.strField\` property must be a non-empty string"`,
    )
  })

  it('throws if string is an object', async () => {
    await expect(
      parseBody<Pick<Body, 'strField'>>(
        makeReqContext({
          strField: {
            bar: 'foo',
          },
        }),
        fields => ({
          strField: fields.string('strField'),
        }),
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"\`body.strField\` property must be a non-empty string"`,
    )
  })

  it('throws if string is missing', async () => {
    await expect(
      parseBody<Pick<Body, 'strField'>>(makeReqContext({}), fields => ({
        strField: fields.string('strField'),
      })),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"\`body.strField\` property must be a non-empty string"`,
    )
  })
})

describe('optional string field', () => {
  it('throws if string is number', async () => {
    await expect(
      parseBody<Pick<Body, 'optionalStr'>>(
        makeReqContext({
          optionalStr: 1,
        }),
        fields => ({
          optionalStr: fields.optionalString('optionalStr'),
        }),
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"\`body.optionalStr\` property must be a non-empty string when it is defined"`,
    )
  })
})
