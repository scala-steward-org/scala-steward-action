import * as exec from '@actions/exec'
import * as core from '@actions/core'

/**
 * Executes a tool and returns its stdout.
 *
 * Throws if the tool exits with a non-zero status.
 */
export async function execute(tool: string, ...arguments_: string[]): Promise<string> {
  let output = ''

  const code = await exec.exec(tool, arguments_, {
    silent: true,
    ignoreReturnCode: true,
    listeners: {
      stdout(data) {
        (output += data.toString())
      }, errline: core.debug,
    },
  })

  if (code !== 0) {
    throw new Error(`There was an error while executing '${tool} ${arguments_.join(' ')}'`)
  }

  return output
}
