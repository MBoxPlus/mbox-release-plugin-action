import * as core from '@actions/core'
import * as github from '@actions/github'

const {pusher, repository} = github.context.payload

export const isNullOrUndefined = (value: unknown): boolean =>
  typeof value === 'undefined' || value === null || value === ''

export interface ActionInterface {
  token: string
  repositoryName: string
  ref: string
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
  ref: isNullOrUndefined(core.getInput('ref'))
    ? core.getInput('ref')
    : process.env.GITHUB_WORKSPACE ?? '',
  workspace: process.env.GITHUB_WORKSPACE || ''
}
