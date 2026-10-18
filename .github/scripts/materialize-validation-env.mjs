import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'

const projectId = process.env.SANITY_PROJECT_ID || 'baseline'
const dataset = process.env.SANITY_DATASET || 'production'
const token = process.env.SANITY_AUTH_TOKEN || 'baseline-validation-token'

function valueFor(key) {
  if (key.endsWith('PROJECT_ID')) return projectId
  if (key.endsWith('DATASET')) return dataset
  if (key.endsWith('API_VERSION')) return '2025-02-19'
  if (key === 'NODE_ENV') return 'production'
  if (key.endsWith('VERCEL_ENV')) return 'production'
  if (key.includes('URL') || key.includes('HOST')) return 'https://example.invalid'
  if (key.includes('TOKEN') || key.includes('SECRET') || key.endsWith('_KEY')) return token
  return null
}

for (const name of existsSync('apps') ? readdirSync('apps') : []) {
  const directory = join('apps', name)
  const example = join(directory, '.env.example')
  if (!existsSync(example)) continue
  const lines = readFileSync(example, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
    .filter(Boolean)
    .flatMap((key) => {
      const value = valueFor(key)
      return value === null ? [] : [`${key}=${value}`]
    })
  writeFileSync(join(directory, '.env.local'), `${lines.join('\n')}\n`)
}
