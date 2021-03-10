import * as changes from './classify_changes'

describe('classify_changes', () => {
  describe('getProbablyDocsRelatedChanges()', () => {
    it('should return true for files that include docs changes', () => {
      const testCases = [
        ['docs/README'],
        ['some/other/file', 'docs/help.asciidoc'],
        ['x-pack/help.asciidoc'],
        ['x-pack/something/help.asciidoc'],
        ['src/something/help.asciidoc'],
        ['examples/something/help.asciidoc'],
        ['some/random/file.asciidoc'],
        ['in/docs/dir/index.js'],
        ['in/doc/dir/index.ts'],
      ]

      for (const testCase of testCases) {
        expect(changes.getProbablyDocsRelatedChanges(testCase)).toBe(true)
      }
    })

    it('should return false for files that do not include docs changes', () => {
      const testCases = [
        ['some/other/file'],
        ['some/other/file', 'some/other/dir/help.js'],
        ['x-pack/something/README.md'],
      ]

      for (const testCase of testCases) {
        expect(changes.getProbablyDocsRelatedChanges(testCase)).toBe(false)
      }
    })
  })
})
