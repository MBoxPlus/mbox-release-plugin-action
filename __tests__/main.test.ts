import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import {expect, test} from '@jest/globals'
import {run, release, build} from '../src/func/run'
import {tmpdir} from 'os'

const GITHUB_PAT = process.env.INPUT_TOKEN ?? process.env.GITHUB_TOKEN

test('build package', async () => {
  const tmp = checkTempExists()
  cp.execSync(
    `git clone https://${GITHUB_PAT}@github.com/MBoxPlus/mbox-workspace.git`,
    {cwd: tmp}
  )
  expect(await build(path.join(tmp, 'mbox-workspace'), tmp)).toBe(
    path.join(tmp, 'mbox_workspace', 'release')
  )
}, 3000000)

test('release package', async () => {
  const tmp = checkTempExists()
  try {
    cp.execSync(
      'curl -LO https://github.com/MBoxPlus/mbox-workspace/releases/download/v1.2.0/MBoxWorkspace.tar.gz',
      {cwd: tmp}
    )
  } catch (error) {
    console.log(error)
  }

  cp.execSync('tar -zxf MBoxWorkspace.tar.gz', {cwd: tmp})
  cp.execSync('rm MBoxWorkspace.tar.gz', {cwd: tmp})
  await expect(
    release(
      process.env['INPUT_TOKEN'] ?? '',
      'MBoxPlus/mbox-workspace',
      path.join(tmp, 'MBoxWorkspace'),
      false
    )
  ).rejects.toThrow('[MBoxWorkspace]: v1.2.0 has already exists.')
}, 300000)

test('throws token missing', async () => {
  await expect(
    run({
      token: '',
      repositoryName: 'MBoxPlus/mbox-workspace',
      workspace: '/Users/yaoli/Desktop/ByteDance/MBoxPlus/mbox-workspace',
      force: false
    })
  ).rejects.toThrow(`Input 'token' is missing.`)
})

// // shows how the runner will run a javascript action with env / stdout protocol
// test('test runs', () => {
//   const np = process.execPath
//   const ip = path.join(__dirname, '..', 'lib', 'main.js')
//   const options: cp.ExecFileSyncOptions = {
//     env: process.env
//   }
//   console.log(cp.execFileSync(np, [ip], options).toString())
// })

function checkTempExists() {
  const tmp = path.join(tmpdir(), 'mbox_github_actions')
  console.log(`Temp dir: ${tmp}`)
  if (fs.existsSync(tmp)) {
    fs.rmdirSync(tmp, {recursive: true})
  }
  fs.mkdirSync(tmp)
  return tmp
}
