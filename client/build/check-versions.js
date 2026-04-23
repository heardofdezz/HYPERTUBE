'use strict'
const semver = require('semver')
const packageConfig = require('../package.json')

function exec (cmd) {
  return require('child_process').execSync(cmd).toString().trim()
}

const versionRequirements = [
  {
    name: 'node',
    currentVersion: semver.clean(process.version),
    versionRequirement: packageConfig.engines.node,
  },
  {
    name: 'npm',
    currentVersion: exec('npm --version'),
    versionRequirement: packageConfig.engines.npm,
  },
]

module.exports = function () {
  const warnings = []

  for (const mod of versionRequirements) {
    if (!semver.satisfies(mod.currentVersion, mod.versionRequirement)) {
      warnings.push(`${mod.name}: ${mod.currentVersion} should be ${mod.versionRequirement}`)
    }
  }

  if (warnings.length) {
    console.log('\nTo use this template, you must update the following modules:\n')
    for (const warning of warnings) console.log('  ' + warning)
    console.log()
    process.exit(1)
  }
}
