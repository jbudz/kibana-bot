import * as changes from './classify_changes'

describe('classify_changes', () => {
  describe('getIncludesDocsSiteChanges()', () => {
    it('should return true for files that include docs changes', () => {
      const testCases = [
        ['docs/README'],
        ['some/other/file', 'docs/help.asciidoc'],
        ['x-pack/help.asciidoc'],
        ['x-pack/something/help.asciidoc'],
        ['src/something/help.asciidoc'],
        ['examples/something/help.asciidoc'],
      ]

      for (const testCase of testCases) {
        expect(changes.getIncludesDocsSiteChanges(testCase)).toBe(true)
      }
    })

    it('should return false for files that do not include docs changes', () => {
      const testCases = [
        ['some/other/file'],
        ['some/other/file', 'some/other/dir/help.asciidoc'],
        ['x-pack/something/README.md'],
        ['non-root/src/somewhere/something.asciidoc'],
        ['non-root/examples/help.asciidoc'],
      ]

      for (const testCase of testCases) {
        expect(changes.getIncludesDocsSiteChanges(testCase)).toBe(false)
      }
    })
  })
})
