# build-metadata

A light weight tool to provide conventional metadata for your app builds.

Someone may have written a better version of this tool but I couldn't find it.

#### System Dependencies

This tool was written for use in mac/linux systems and assumes you have `git` installed. I've tried to keep things OS-independent, but I have not tested or verified other systems.

### Getting Started

The "out-of-the-box" metadata captured:

- `buildId`: A unique id to represent the build.
- `buildTimestamp`: When the build was created.
- `buildVersion`: A version that can be more granular than your latest tag... perfect for applications publishing internal test builds, release-clients, etc. Derived via git (`git describe --tags`) if not explicitly stated, but can append append whatever values you want to increase the granularity.
- `commitSha`: Unique id of the latest commit. Derived via get if not explicitly stated
- `commitStatus`: Commit status of repo at build time (`clean` or `dirty`), denoting whether or not there or uncommited changes. Derived via git if not explicitly stated.
- `commitTitle`: Title of the latest commit, i.e. the first line of the message. Derived via git if not explicitly stated

Since each codebase is different, all of these standard values can be easily customized to fit your project.

#### CLI

This CLI is primarily a build tool designed to provide quick and easy results

To generate the build metadata file in your project (`build-metatdata.json`), navigate to the project root and run:
```
npx build-metadata create
```

If you're curious, you can inspect the generated metadata file
```
npx build-metadata inspect
```

Need to customize the metadata that's captured? Just override one (or all) of the values... or provide your own
```
npx build-metadata create -p "buildVersion=v1.2.0--test-build-1" -p "workflowRunId=${{ github.run_id }}"
```

And if you're running this as part of a docker image build, the CLI can give you some easy-to-use build arguments to add this metadata directly onto your docker image
```
docker build $(npx build-metadata docker-args) .
```

#### API

You can also use `build-metadata` in your project at runtime as a convenient way to interact with the metadata.

Install via
```
npm install build-metadata
```

You can access the existing build metadata at runtime via:
```
const buildMetadata = require('build-metadata')

const console.log(JSON.stringify(buildMetadata.load(), undefined, 2))
```

