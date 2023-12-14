#!/usr/bin/env node

const sywac = require('sywac')

const { FILE_PATH_DEFAULT, create, load, determineBuildVersion, getDockerBuildArgs } = require('.')
const packageJson = require('./package.json')

sywac
  .boolean('--debug, --verbose', {
    desc: 'Debug mode, show inline log outputs'
  })
  .command('create', {
    desc: 'Create build info file',
    setup: sywac => {
      sywac
        .array('-p, --prop <key=value>', {
          desc: 'Set a default property value',
          coerce: (props) => {
            const result = {}
            props.forEach(propString => {
              const [key, value] = propString.split('=')
              result[key] = value
            })
            return result
          }
        })
        .string('--filePath <filePath>', {
          desc: 'Path of build info file',
          defaultValue: FILE_PATH_DEFAULT
        })
        .boolean('-d, --dockerArgs', {
          desc: 'Output docker args from created build info'
        })
    },
    run: runCreateCommand
  })
  .command('build-version', {
    desc: 'Determine the build version',
    setup: sywac => {
      sywac
        .string('-b, --base <base>', {
          desc: 'Explicit version base, e.g. v1.2.3. If not provided, base will be derived locally via git.'
        })
        .string('-s, --suffix <suffix>', {
          desc: 'A string to append to the version, e.g. a branch name or unique build number. If provided, version will be formatted as "{base}__{suffix}"'
        })
    },
    run: runBuildVersionCommand
  })
  .command('inspect', {
    desc: 'Inspect an existing build info file',
    setup: sywac => {
      sywac
        .string('--filePath <filePath>', {
          desc: 'Path of build info file',
          defaultValue: FILE_PATH_DEFAULT
        })
    },
    run: runInspectCommand
  })
  .command('docker-args', {
    desc: 'Determine docker build args from an existing build info file',
    setup: sywac => {
      sywac
        .string('--filePath <filePath>', {
          desc: 'Path of build info file',
          defaultValue: FILE_PATH_DEFAULT
        })
        .string('--labelNamespace <labelNamespace>', {
          desc: 'Prefix labels with a custom namespace, eg com.someorg.myproject'
        })
    },
    run: runDockerArgsCommand
  })
  .preface(packageJson.name, packageJson.description)
  .showHelpByDefault()
  .help('-h, --help')
  .version('-v, --version', {
    version: packageJson.version
  })
  .parseAndExit()

async function runCreateCommand (argv, context) {
  const {
    debug,
    dockerArgs,
    filePath,
    prop
  } = argv

  const logger = getLogger(debug)

  // TODO: prop type hinting

  const buildInfo = create({
    defaults: prop,
    filePath,
    logger
  })

  logger?.info?.(JSON.stringify(buildInfo, undefined, 2))

  if (dockerArgs) {
    const dockerArgs = getDockerBuildArgs(buildInfo)
    writeStdOut(dockerArgs)
  }
}

async function runBuildVersionCommand (argv, context) {
  const {
    base,
    debug,
    suffix
  } = argv

  const logger = getLogger(debug)
  const version = determineBuildVersion({ base, logger, suffix })
  writeStdOut(version)
}

async function runInspectCommand (argv, context) {
  const {
    debug,
    filePath
  } = argv

  const logger = getLogger(debug)

  const buildInfo = load({ filePath })
  if (buildInfo) {
    writeStdOut(JSON.stringify(buildInfo, undefined, 2))
  } else {
    logger?.info?.(`Build info not found at ${filePath}`)
  }
}

async function runDockerArgsCommand (argv, context) {
  const {
    debug,
    filePath
  } = argv

  const logger = getLogger(debug)

  const buildInfo = load({ filePath })
  if (buildInfo) {
    const dockerArgs = getDockerBuildArgs(buildInfo)
    writeStdOut(dockerArgs)
  } else {
    logger?.info?.(`Build info not found at ${filePath}`)
  }
}

function writeStdOut (str = '') {
  process.stdout.write(str + '\n')
}

function getLogger (isDebug) {
  let logger

  if (isDebug) {
    logger = {
      info: (...args) => {
        console.log('INFO:', ...args)
      },
      warn: (...args) => {
        console.warn('WARN:', ...args)
      }
    }
  }

  return logger
}
