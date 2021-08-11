import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import {expect, test} from '@jest/globals'
import {run, release, build} from '../src/func/run'
import {tmpdir} from 'os'

const GITHUB_PAT = process.env.INPUT_TOKEN ?? process.env.GITHUB_TOKEN
const TEST_OWNER = 'MBoxPlus'
const TEST_REPO = 'mbox-workspace-test'
const TEST_PLUGIN_NAME = 'MBoxWorkspace'

test('build package', async () => {
  const tmp = checkTempExists()
  cp.execSync(
    `git clone https://${GITHUB_PAT}@github.com/${TEST_OWNER}/${TEST_REPO}.git`,
    {cwd: tmp}
  )
  expect(await build(path.join(tmp, TEST_REPO), tmp)).toBe(
    path.join(tmp, TEST_REPO, 'release')
  )
}, 3000000)

test('release package', async () => {
  const tmp = checkTempExists()
  try {
    cp.execSync(
      `curl -LO https://github.com/${TEST_OWNER}/${TEST_REPO}/releases/download/v1.2.0/${TEST_PLUGIN_NAME}.tar.gz`,
      {cwd: tmp}
    )
  } catch (error) {
    console.log(error)
  }

  cp.execSync(`tar -zxf ${TEST_PLUGIN_NAME}.tar.gz`, {cwd: tmp})
  cp.execSync(`rm ${TEST_PLUGIN_NAME}.tar.gz`, {cwd: tmp})
  await expect(
    release(
      process.env['INPUT_TOKEN'] ?? '',
      `${TEST_OWNER}/${TEST_REPO}`,
      'main',
      path.join(tmp, TEST_PLUGIN_NAME),
      false
    )
  ).rejects.toThrow(`[${TEST_PLUGIN_NAME}]: v1.2.0 has already exists.`)
}, 300000)

test('throws token missing', async () => {
  await expect(
    run({
      token: '',
      repositoryName: `${TEST_OWNER}/${TEST_REPO}`,
      ref: 'refs/heads/main',
      workspace: `xxxx`,
      force: false
    })
  ).rejects.toThrow(`Input 'token' is missing.`)
})

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  const tmp = checkTempExists()
  cp.execSync(
    `git clone --branch main https://${GITHUB_PAT}@github.com/${TEST_OWNER}/${TEST_REPO}.git`,
    {cwd: tmp}
  )
  process.env['INPUT_FORCE'] = 'false'
  process.env['INPUT_REF'] = 'refs/heads/main'
  process.env['GITHUB_REPOSITORY'] = `${TEST_OWNER}/${TEST_REPO}`
  process.env['GITHUB_WORKSPACE'] = path.join(tmp, TEST_REPO)

  const np = process.execPath
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecFileSyncOptions = {
    env: process.env
  }
  console.log(cp.execFileSync(np, [ip], options).toString())
})

function checkTempExists() {
  const tmp = path.join(tmpdir(), 'mbox_github_actions')
  console.log(`Temp dir: ${tmp}`)
  if (fs.existsSync(tmp)) {
    fs.rmdirSync(tmp, {recursive: true})
  }
  fs.mkdirSync(tmp)
  return tmp
}
