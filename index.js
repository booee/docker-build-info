const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const FILE_PATH_DEFAULT = './build-info.json'

async function load (opts) {
  const {
    filePath = FILE_PATH_DEFAULT,
    logger
  } = opts || {}

  logger?.info?.(`Reading file ${filePath}`)
  const fileData = readFile(filePath)
  return JSON.parse(fileData)
}

async function create (opts) {
  const {
    defaults,
    filePath = FILE_PATH_DEFAULT,
    logger
  } = opts

  if (!filePath) throw new Error(`a filePath is required, eg "${FILE_PATH_DEFAULT}"`)

  const createdAt = new Date()

  const buildInfo = {
    buildId: createdAt.getTime(), // need a guid, using epoch as a stand-in
    buildTimestamp: createdAt.toISOString(),
    buildVersion: null,
    commitSha: null,
    commitStatus: null,
    commitTitle: null,
    ...defaults
  }

  if (!buildInfo.buildVersion) {
    logger?.info?.('Deriving buildVersion locally')
    buildInfo.buildVersion = await determineBuildVersion({ logger })
  }

  if (!buildInfo.commitSha) {
    logger?.info?.('Deriving commit sha locally')
    buildInfo.commitSha = gitCommitSha()
  }

  if (!buildInfo.commitTitle) {
    logger?.info?.('Deriving commit title locally')
    const commitMessage = gitCommitMessage()
    buildInfo.commitTitle = commitMessage?.split('\n')[0] // denote title by first line break
  }

  if (!buildInfo.commitStatus) {
    logger?.info?.('Deriving commit status locally')
    buildInfo.commitStatus = gitIsDirty() ? 'dirty' : 'clean'
  }

  logger?.info?.(`Creating build info: ${filePath}`)
  writeFile(filePath, JSON.stringify(buildInfo, undefined, 2))

  return buildInfo
}

async function determineBuildVersion (opts) {
  const {
    base,
    logger,
    suffix
  } = opts || {}

  let version = base
  if (!version) {
    logger?.info?.('Deriving version base locally')
    const derivedBase = gitDescribeTags()

    if (!derivedBase) {
      throw new Error('Unable to derive version base')
    }
  }

  if (suffix) {
    version += `__${suffix}`
  }

  return version
}

function getDockerBuildArgs (buildInfo, opts) {
  const {
    labelNamespace
  } = opts || {}

  let labels = []

  if (buildInfo) {
    const labelPrefix = labelNamespace ? `${labelNamespace}.` : ''
    labels = Object.keys(buildInfo)?.map(key => {
      // low-effort formatting/escaping with JSON.stringify
      return '--label ' + JSON.stringify(`${labelPrefix}${key}=${String(buildInfo[key])}`)
    })
  }

  // TODO: tags?

  const args = [
    ...labels
  ]

  return args?.join(' ')
}

function readFile (filePath) {
  if (!fs.existsSync(filePath)) {
    // throw new Error(`File not found: ${filePath}`)
    return null
  }

  return fs.readFileSync(filePath, 'utf8')
}

function writeFile (filePath, fileData) {
  const dir = path.dirname(filePath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(filePath, fileData)
}

// TODO: replace git executions with simple-git https://github.com/steveukx/git-js

function gitCommitMessage () {
  return executeCommand('git log -1 --pretty=%B')
}

function gitCommitSha () {
  return executeCommand('git rev-parse HEAD')
}

function gitDescribeTags () {
  return executeCommand('git describe --tags --dirty')
}

function gitIsDirty () {
  return !!executeCommand('git status --porcelain')
}

function executeCommand (command) {
  const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim()
  return output
}

module.exports = {
  FILE_PATH_DEFAULT,

  create,
  load,
  determineBuildVersion,
  getDockerBuildArgs
}
