import {exec} from '@actions/exec'
import buffer from 'buffer'

/** Wrapper around the GitHub toolkit exec command which returns the output.
 * Also allows you to easily toggle the current working directory.
 *
 * @param {string} cmd - The command to execute.
 * @param {string} cwd - The current working directory.
 * @param {boolean} silent - Determines if the in/out should be silenced or not.
 */
export async function execute(
  cmd: string,
  cwd: string,
  silent: boolean = false
): Promise<string> {
 let output = ''

  await exec(cmd, [], {
    // Silences the input unless the INPUT_DEBUG flag is set.
    silent,
    cwd,
    listeners: {
      stdout(data: Buffer | string): void {
        const dataString = data.toString().trim()
        if (output.length + dataString.length < buffer.constants.MAX_STRING_LENGTH) {
          output += dataString
        }
      }
    }
  })

  return Promise.resolve(output)
}
