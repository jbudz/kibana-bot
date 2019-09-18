import { getConfigVar } from '@spalger/micro-plus'
import { GithubApi } from './github_api'
import { log } from './log'

describe('getPrsAndFiles()', () => {
  it('gets expected result', async () => {
    const api = new GithubApi(log, getConfigVar('GITHUB_SECRET'))
    await expect(
      api.getPrsAndFiles('3c8ae0aaeb3c5e6c34c16617efa12d3bc8846439', 'closed'),
    ).resolves.toMatchInlineSnapshot(`
      Array [
        Object {
          "files": Array [
            "Jenkinsfile",
            "src/dev/failed_tests/cli.js",
            "test/scripts/jenkins_ci_group.sh",
            "test/scripts/jenkins_firefox_smoke.sh",
            "test/scripts/jenkins_unit.sh",
            "test/scripts/jenkins_visual_regression.sh",
            "test/scripts/jenkins_xpack.sh",
            "test/scripts/jenkins_xpack_ci_group.sh",
            "test/scripts/jenkins_xpack_firefox_smoke.sh",
            "test/scripts/jenkins_xpack_visual_regression.sh",
          ],
          "hasMoreFiles": false,
          "id": 45551,
          "lastCommitSha": "3c8ae0aaeb3c5e6c34c16617efa12d3bc8846439",
        },
      ]
    `)
  })
})
