const semver = require('semver')

const required = '>=18 <22'
const current = process.version

if (!semver.satisfies(current, required)) {
  console.error(`❌ Unsupported Node version ${current}. Use Node 20 LTS.`)
  process.exit(1)
}
