import {setFailed} from '@actions/core'
import {action} from './func/input'
import {run} from './func/run'

try {
  run(action)
} catch (error) {
  setFailed(error.message)
}
