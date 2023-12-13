#!/usr/bin/env node

const sywac = require('sywac')

const { FILE_PATH_DEFAULT, create, load, determineBuildVersion, getDockerBuildArgs } = require('.')
const packageJson = require('./package.json')

sywac
  .boolean('--debug, --verbose', {
    desc: 'Debug mode, show inline log outputs'
  })
  .command('create', {
    desc: 'Create build metadata file',
    setup: sywac => {
      sywac
        .array('-p, --prop <key=value>', {
          desc: 'Set a property value',
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
          desc: 'Path of build metadata file',
          defaultValue: FILE_PATH_DEFAULT
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
    desc: 'Inspect an existing build metadata file',
    setup: sywac => {
      sywac
        .string('--filePath <filePath>', {
          desc: 'Path of build metadata file',
          defaultValue: FILE_PATH_DEFAULT
        })
    },
    run: runInspectCommand
  })
  .command('docker-args', {
    desc: 'Determine docker build args from an existing build metadata file',
    setup: sywac => {
      sywac
        .string('--filePath <filePath>', {
          desc: 'Path of build metadata file',
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
    filePath,
    prop,
    debug
  } = argv

  const logger = await getLogger(debug)

  const buildMetadata = await create({
    buildMetadata: prop,
    filePath,
    logger
  })

  logger?.info?.(JSON.stringify(buildMetadata, undefined, 2))
}

async function runBuildVersionCommand (argv, context) {
  const {
    base,
    debug,
    suffix
  } = argv

  const logger = await getLogger(debug)
  const version = await determineBuildVersion({ base, logger, suffix })
  writeStdOut(version)
}

async function runInspectCommand (argv, context) {
  const {
    debug,
    filePath
  } = argv

  const logger = await getLogger(debug)

  const buildMetadata = await load({ filePath })
  if (buildMetadata) {
    writeStdOut(JSON.stringify(buildMetadata, undefined, 2))
  } else {
    logger?.info?.(`Metadata not found at ${filePath}`)
  }
}

async function runDockerArgsCommand (argv, context) {
  const {
    debug,
    filePath
  } = argv

  const logger = await getLogger(debug)

  const buildMetadata = await load({ filePath })
  if (buildMetadata) {
    const dockerArgs = getDockerBuildArgs(buildMetadata)
    writeStdOut(dockerArgs.string)
  } else {
    logger?.info?.('No metadata found')
  }
}

function writeStdOut (str = '') {
  process.stdout.write(str + '\n')
}

async function getLogger (isDebug) {
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
