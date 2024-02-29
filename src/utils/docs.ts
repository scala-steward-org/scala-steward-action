// Copy inputs from `action.yml` into `README.md`

import * as fs from 'fs'
import * as yaml from 'js-yaml'

/**
 * Copy inputs from `action.yml`
 */
type ActionYaml = {inputs: Record<string, {description: string; default: string | undefined}>}

const actionYaml = yaml.load(fs.readFileSync('action.yml', {encoding: 'utf8'})) as ActionYaml

const inputs = Object.entries(actionYaml.inputs).flatMap(input =>
  [
    '',
    ...input[1].description.trimEnd().split('\n').map(line => `    # ${line}`),
    ...(input[1].default ? ['    #', `    # Default: ${input[1].default}`] : []),
    `    ${input[0]}: ''`,
  ],
)

/**
 * Update `README.md`
 */
const readme = fs.readFileSync('README.md', {encoding: 'utf8'})

const start = readme.indexOf('<!-- start usage -->') + '<!-- start usage -->'.length
const end = readme.indexOf('<!-- end usage -->')

const content = [
  readme.slice(0, start),
  '```yaml',
  '- uses: scala-steward-org/scala-steward-action@v2',
  '  with:',
  ...inputs.slice(1),
  '```',
  readme.slice(end),
].join('\n')

fs.writeFileSync('README.md', content)
