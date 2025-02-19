# Docken 🐳

[![npm version][npm-version-src]][npm-version-href]
[![npm version][codecov-src]][codecov-href]
[![Master Workflow][workflow-src]][workflow-href]
[![Known Vulnerabilities][snyk-src]][snyk-href]
[![Conventional Commits][conventional-src]][conventional-href]

This is a library built on top of dockerode for interacting with the docker daemon.
Besides, it enables scanning organized dockerfiles via FS.

> 🚧 **Work in Progress**
>
> The library is currently under active development and is not yet ready for production.


**Table of Contents**
- [Installation](#installation)
- [Usage](#usage)
  - [Daemon](#daemon)
  - [FS Scan](#fs-scan)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install docken --save
```

## Usage

### Daemon
...

### FS Scan
**`Image`**

An image is in most cases represented by a Dockerfile in a directory. In some cases
the image is also described with some meta information by an image descriptor file (`image.json`).
But the descriptor file can also be a replacement for the Dockerfile.

**`Group`**

A group has the same base properties as an image. The only other difference
is, that the descriptor file must be named `group.json`.

**`Meta`**

The meta object has the following **3** properties:
- `path`
  The path is the relative path on the host machine, with different path separators (windows: `\\`, linux: `/`)
  depending on the operating system.
- `virtualPath`
  The virtualPath is a path only containing group ids and the own image id, seperated with `/`.
- `attributes`
  The attributes property holds an object of optional data provided via `image.json` or `group.json` file.

## Contributing

Before starting to work on a pull request, it is important to review the guidelines for
[contributing](./CONTRIBUTING.md) and the [code of conduct](./CODE_OF_CONDUCT.md).
These guidelines will help to ensure that contributions are made effectively and are accepted.

## License

Made with 💚

Published under [MIT License](./LICENSE).

[npm-version-src]: https://badge.fury.io/js/docken.svg
[npm-version-href]: https://npmjs.com/package/docken
[codecov-src]: https://codecov.io/gh/Tada5hi/docken/branch/master/graph/badge.svg?token=4KNSG8L13V
[codecov-href]: https://codecov.io/gh/Tada5hi/docken
[workflow-src]: https://github.com/Tada5hi/docken/workflows/CI/badge.svg
[workflow-href]: https://github.com/Tada5hi/docken
[snyk-src]: https://snyk.io/test/github/Tada5hi/docken/badge.svg?targetFile=package.json
[snyk-href]: https://snyk.io/test/github/Tada5hi/docken?targetFile=package.json
[conventional-src]: https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white
[conventional-href]: https://conventionalcommits.org
