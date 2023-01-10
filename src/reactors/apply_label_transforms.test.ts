import { applyLabelTransforms } from './apply_label_transforms'

it('calls the transform functions in order', () => {
  const transforms = [
    jest.fn().mockReturnValue(['bar', 'baz']),
    jest.fn().mockReturnValue(['box', 'bot']),
  ]

  applyLabelTransforms(['foo', 'bar'], transforms)

  expect(transforms).toMatchInlineSnapshot(`
    [
      [MockFunction] {
        "calls": [
          [
            [
              "foo",
              "bar",
            ],
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": [
              "bar",
              "baz",
            ],
          },
        ],
      },
      [MockFunction] {
        "calls": [
          [
            [
              "bar",
              "baz",
            ],
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": [
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
    {
      "added": [
        "baz",
      ],
      "labels": [
        "foo",
        "bar",
        "baz",
      ],
      "removed": [],
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
    {
      "added": [],
      "labels": [
        "bar",
        "box",
      ],
      "removed": [
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
    {
      "added": [
        "zip",
      ],
      "labels": [
        "bar",
        "box",
        "zip",
      ],
      "removed": [
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
