import { applyLabelTransforms } from './apply_label_transforms'

it('calls the transform functions in order', () => {
  const transforms = [
    jest.fn().mockReturnValue(['bar', 'baz']),
    jest.fn().mockReturnValue(['box', 'bot']),
  ]

  applyLabelTransforms(['foo', 'bar'], transforms)

  expect(transforms).toMatchInlineSnapshot(`
    Array [
      [MockFunction] {
        "calls": Array [
          Array [
            Array [
              "foo",
              "bar",
            ],
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": Array [
              "bar",
              "baz",
            ],
          },
        ],
      },
      [MockFunction] {
        "calls": Array [
          Array [
            Array [
              "bar",
              "baz",
            ],
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": Array [
              "box",
              "bot",
            ],
          },
        ],
      },
    ]
  `)
})

it('returns the new label list if label was added', () => {
  expect(applyLabelTransforms(['foo', 'bar'], [(l) => [...l, 'baz']]))
    .toMatchInlineSnapshot(`
    Object {
      "added": Array [
        "baz",
      ],
      "labels": Array [
        "foo",
        "bar",
        "baz",
      ],
      "removed": Array [],
    }
  `)
})

it('returns the new label list if a label was removed', () => {
  expect(
    applyLabelTransforms(
      ['foo', 'bar', 'box'],
      [(labels) => labels.filter((l) => l.startsWith('b'))],
    ),
  ).toMatchInlineSnapshot(`
    Object {
      "added": Array [],
      "labels": Array [
        "bar",
        "box",
      ],
      "removed": Array [
        "foo",
      ],
    }
  `)
})

it('returns the new label list if a label was added and a label was removed', () => {
  expect(
    applyLabelTransforms(
      ['foo', 'bar', 'box'],
      [
        (labels) => labels.filter((l) => l.startsWith('b')),
        (labels) => [...labels, 'zip'],
      ],
    ),
  ).toMatchInlineSnapshot(`
    Object {
      "added": Array [
        "zip",
      ],
      "labels": Array [
        "bar",
        "box",
        "zip",
      ],
      "removed": Array [
        "foo",
      ],
    }
  `)
})

it('returns null if the labels are unchanged', () => {
  expect(
    applyLabelTransforms(['foo', 'bar'], [(labels) => [...labels]]),
  ).toMatchInlineSnapshot(`null`)
})
