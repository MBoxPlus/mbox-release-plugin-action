import {setFailed} from '@actions/core'
import {action} from './func/input'
import {run} from './func/run'

try {
  run(action).catch(error => {
    console.error(error)
    setFailed(error.message)
  })
} catch (error) {
  setFailed(error.message)
}
