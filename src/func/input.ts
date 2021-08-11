import * as core from '@actions/core'
import * as github from '@actions/github'

const {pusher, repository} = github.context.payload

export interface ActionInterface {
  token: string
  repositoryName: string
  workspace: string
  force: boolean
}

export const action: ActionInterface = {
  token: core.getInput('token'),
  force: core.getBooleanInput('force'),
  repositoryName:
    (repository && repository.full_name
      ? repository.full_name
      : process.env.GITHUB_REPOSITORY) ?? '',
  workspace: process.env.GITHUB_WORKSPACE || ''
}
