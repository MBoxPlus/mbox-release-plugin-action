import {info} from '@actions/core'
import * as github from '@actions/github'
import * as path from 'path'
import * as fs from 'fs'
import * as YAML from 'yaml'
import {execute} from './execute'
import {ActionInterface} from './input'

export async function run(action: ActionInterface): Promise<void> {
  if (!action.token || action.token.length == 0) {
    throw new Error(`Input 'token' is missing.`)
  }

  if (!action.repositoryName || action.repositoryName.length == 0) {
    throw new Error(`GitHub 'repositoryName' is missing.`)
  }

  if (!action.workspace || action.workspace.length == 0) {
    throw new Error(`GitHub 'workspace' is missing.`)
  }

  try {
    const root = path.resolve(path.join(action.workspace, '..'))
    const packagesDir = await build(action.workspace, root)
    for (const dir of fs.readdirSync(packagesDir)) {
      const pluginDir = path.join(packagesDir, dir)
      if (!fs.statSync(pluginDir).isDirectory()) {
        return
      }
      await release(
        action.token,
        action.repositoryName,
        pluginDir,
        action.force
      )
    }
  } catch (error) {
    throw error
  }
}

export async function build(plugin_repo_path: string, root: string) {
  try {
    info('Check MBox Installed')
    const exist = null
    try {
      const exist = await execute(`command -v mbox`, root)
    } catch (error) {}
    if (!exist) {
      info('Installing mbox')
      await execute(`brew tap MBoxPlus/homebrew-tap`, root)
      await execute(`brew install mbox`, root)
    } else {
      info('MBox Installed')
    }
  } catch (error) {
    throw new Error('Installation of MBox failed.')
  }

  // await execute(
  //   `git config --global url."https://${action.token}@github".insteadOf https://github`,
  //   root
  // )
  const workspaceRoot = path.join(root, 'mbox_workspace')
  await execute(`mkdir mbox_workspace`, root)
  await execute(`mbox init plugin -v`, workspaceRoot)
  await execute(`mbox add ${plugin_repo_path} --mode=copy -v`, workspaceRoot)

  await execute(`mbox pod install -v`, workspaceRoot)
  await execute(`mbox plugin build --force -v --no-test`, workspaceRoot)

  const packagesDir = path.join(workspaceRoot, 'release')
  return packagesDir
}

export async function release(
  token: string,
  repoName: string,
  packageDir: string,
  force: boolean
) {
  const manifestPath = path.join(packageDir, 'manifest.yml')
  if (!fs.existsSync(manifestPath)) {
    info(`${packageDir} is not the directory of a plugin package.`)
    return
  }
  const pluginInfo = YAML.parse(fs.readFileSync(manifestPath, 'utf8'))
  const version = pluginInfo['VERSION']
  const name = pluginInfo['NAME']

  info(`Archiving Plugin [${name}]`)
  info(
    `tar -czf ${path.basename(packageDir)}.tar.gz ${path.basename(packageDir)}`
  )
  await execute(
    `tar -czf ${path.basename(packageDir)}.tar.gz ${path.basename(packageDir)}`,
    path.dirname(packageDir)
  )

  const api = github.getOctokit(token).rest
  const [owner, repo] = repoName.split('/')
  let result: any | null = null
  try {
    const result = (
      await api.repos.getReleaseByTag({
        owner,
        repo,
        tag: `v${version}`
      })
    ).data
  } catch (error) {
    info(`[${name}]: v${version} has not been created.`)
  }

  if (result && result.id) {
    if (force) {
      info(`[${name}]: v${version} has already exists.`)
    } else {
      throw Error(`[${name}]: v${version} has already exists.`)
    }
  }
  let upload_url: string | null = null
  if (!result || !result.id) {
    info(
      `Create Release Asset [name=v${version}, tag_name=v${version}, target_commitish=main]`
    )
    upload_url = (
      await api.repos.createRelease({
        owner,
        repo,
        name: `v${version}`,
        tag_name: `v${version}`,
        target_commitish: 'main'
      })
    ).data.upload_url
  } else if (result.id && force) {
    info(
      `Update Release Asset [name=v${version}, tag_name=v${version}, target_commitish=main]`
    )
    upload_url = (
      await api.repos.updateRelease({
        owner,
        repo,
        release_id: result.id,
        name: `v${version}`,
        tag_name: `v${version}`,
        target_commitish: 'main'
      })
    ).data.upload_url
  }

  if (!upload_url) {
    throw Error('Asset uploading url is null')
  }

  if (result && result.assets.length > 0 && force) {
    for (const asset of result.assets) {
      info(`Delete Release Asset [id=${asset.id}, name=${asset.name}]`)
      await api.repos.deleteReleaseAsset({owner, repo, asset_id: asset.id})
    }
  }

  if (upload_url) {
    const regex = /^(.*)\{\?name,label\}/
    const match = upload_url.match(regex)
    if (match) {
      upload_url = match[1]
      info(`Uploading Plugin [${name}] to URL [${upload_url}]`)
      const releaseFilePath = path.join(
        path.dirname(packageDir),
        `${path.basename(packageDir)}.tar.gz`
      )
      const output = await execute(
        `curl -s -u username:${token} -X POST -H "Accept: application/vnd.github.v3+json" -H "Content-Type: application/zip" --data-binary @${releaseFilePath} ${upload_url}?name=${path.basename(
          releaseFilePath
        )}`,
        path.dirname(packageDir)
      )
      info(output)
      info(`Upload Succeeded.`)
    }
  }
}
