<p align="center"><img src=".github/assets/logo.svg" width="144" height="144" alt="Docken logo" /></p>
<h1 align="center">Docken</h1>
<p align="center"><strong>A library providing utilities for the interaction with docker.</strong></p>
<p align="center">Use dockerode clients, await Docker progress streams and discover image directories with metadata.</p>
<p align="center">
  <a href="https://www.npmjs.com/package/docken"><img src="https://img.shields.io/npm/v/docken" alt="npm version" /></a>
  <a href="https://github.com/tada5hi/docken/actions"><img src="https://img.shields.io/github/actions/workflow/status/tada5hi/docken/main.yml" alt="CI status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/docken" alt="License" /></a>
</p>
<p align="center"><a href="#installation">Installation</a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="#notes">Notes</a></p>

---

## Why Docken?

Use dockerode clients, await Docker progress streams and discover image directories with metadata.

| Concern | Without it | With it |
|---|---|---|
| Daemon client | Construct dockerode directly | Create a typed client with createClient |
| Build and pull streams | Decode completion and progress yourself | Await waitForStream with operation callbacks |
| Local image catalog | Write a metadata-aware walker | Scan images and inherited group attributes |

waitForStream delegates to the Docker modem, dispatches chunks to specific progress callbacks before generic callbacks, and resolves output or rejects the completion error. Callback promises are not awaited.

<img src=".github/assets/mechanism.svg" width="960" alt="waitForStream delegates to the Docker modem, dispatches chunks to specific progress callbacks before generic callbacks, and resolves output or rejects the completion error. Callback promises are not awaited." />

**Table of Contents**

- [Why Docken?](#why-docken)
- [Installation](#installation)
- [Usage](#usage)
  - [Daemon](#daemon)
  - [FS Scan](#fs-scan)
- [Progress streams](#progress-streams)
- [Filesystem catalog](#filesystem-catalog)
- [API](#api)
- [Notes](#notes)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install docken
```

Requires Node `>=22.0.0`. ESM, CommonJS and TypeScript declarations are included. Import the documented package entrypoint rather than undeclared `dist/` paths.

## Usage

```typescript
import { createClient, isClient, scanDirectory } from 'docken';

const client = createClient({ socketPath: '/var/run/docker.sock' });
console.log(isClient(client)); // true; constructing does not contact Docker

const catalog = await scanDirectory('./images');
console.log(catalog.images, catalog.groups);
```

### Daemon

`createClient(options)` returns a dockerode client and accepts dockerode's connection options, such as `socketPath`. You then call dockerode methods directly. Construction alone does not check connectivity. The [progress stream example](#progress-streams) shows how to await a real pull operation.

### FS Scan

**Image:** a directory containing a `Dockerfile` or an `image.json` descriptor. A descriptor can replace the Dockerfile for discovery; scanning does not prove that the directory can be built.

**Group:** a directory containing `image-group.json`. Its descriptor attributes are inherited by descendant items and can be overridden by child descriptors.

**Metadata:** each discovered item has these fields:

| Field | Meaning |
|---|---|
| `path` | Filesystem path relative to the scan input context, with host-platform separators; a recognized root includes its directory name |
| `virtualPath` | Recognized group/image directory names joined with `/`; ordinary intermediate directories do not add a virtual segment |
| `attributes` | Optional descriptor fields, merged over inherited parent-group fields |

Unlike `docker-scan`, Docken does not interpret descriptor IDs as virtual path segments. Its `MetaFileName.GROUP` is `image-group.json`.

## Progress streams

```typescript
import { createClient, waitForStream } from 'docken';

const client = createClient();
const stream = await client.pull('hello-world:latest');
await waitForStream(client, stream, {
    onDownloading: ({ percent }) => console.log(percent),
    onFinished: () => console.log('Pull finished'),
});
```

This example contacts your Docker daemon and may download an image. `waitForModemStream(modem, stream, options)` provides the same behavior with a modem directly.

| Callback | Receives |
|---|---|
| `onDownloading` / `onPushing` / `onBuilding` | `{ current, total, percent }` |
| `onExtracting` | `{ value, unit }` |
| `onStatusChunk` | An otherwise unhandled status chunk |
| `onStreamChunk` | An otherwise unhandled textual stream chunk |
| `onChunk` | A chunk not handled by a more specific callback |
| `onFinished` | Successful completion notification, no arguments |

Callbacks are dispatched by specificity; a chunk handled by an operation callback is not also sent to every generic callback. `buildProgress(current, total)` floors the percentage and does not clamp it or guard a zero total.

## Filesystem catalog

`scanDirectory(cwd)` returns `{ images, groups }`, sorted by case-insensitive filesystem path. Each item has `path`, optional `virtualPath` and optional `attributes`.

A group is marked by **`image-group.json`**. An image uses **`image.json`** or a **`Dockerfile`**. Descriptor files may stand in for a Dockerfile. Filesystem paths retain ordinary intermediate directories; virtual paths follow recognized groups/images. This is discovery, not Dockerfile validation or image building.

## API

All names below are exported from `docken`. Types have no runtime value.

| Export | Kind | Purpose |
|---|---|---|
| `isClient` | function | Check for a dockerode client instance |
| `waitForStream` | function | Await a client modem stream with progress callbacks |
| `createClient` | function | Construct a dockerode client |
| `Client` | type | Type contract for client |
| `ClientOptions` | type | Type contract for client options |
| `buildProgress` | function | Build current/total/floored-percent progress |
| `Progress` | type | Type contract for progress |
| `waitForModemStream` | function | Await a modem stream directly with progress callbacks |
| `ModemStatusChunk` | type | Type contract for modem status chunk |
| `ModemStreamChunk` | type | Type contract for modem stream chunk |
| `ModemOnFinishedFn` | type | Type contract for modem on finished fn |
| `ModemOnChunkFn` | type | Type contract for modem on chunk fn |
| `ModemOnStreamChunkFn` | type | Type contract for modem on stream chunk fn |
| `ModemOnStatusChunkFn` | type | Type contract for modem on status chunk fn |
| `ModemOnProgressFn` | type | Type contract for modem on progress fn |
| `ModemOnQuantityFn` | type | Type contract for modem on quantity fn |
| `ModemStreamWaitOptions` | type | Type contract for modem stream wait options |
| `Modem` | type | Type contract for modem |
| `MetaType` | enum | Image and group categories |
| `MetaFileName` | enum | image.json and image-group.json filenames |
| `detectDirectoryMeta` | function | Detect image/group metadata or a Dockerfile |
| `readMetaFile` | function | Load the image or group JSON descriptor |
| `DirectoryMeta` | type | Type contract for directory meta |
| `scanDirectory` | function | Discover image and group directories recursively |
| `sortScanResultItemsByPath` | function | Sort scan items in place by filesystem path |
| `ScanResultItem` | type | Type contract for scan result item |
| `ScanResult` | type | Type contract for scan result |

## Notes

- **Work in progress.** The project remains under active development and is not advertised as production-ready.
- **Daemon access is separate.** Constructing a client and scanning files do not require Docker access. Calling dockerode operations requires a reachable daemon and appropriate permissions.
- **Callbacks are not awaited.** Progress callback return promises do not delay stream completion. Handle asynchronous work and errors inside your own callbacks.
- **No retries or cancellation layer.** Stream errors reject the returned promise. The helpers do not retry daemon operations or cancel the underlying stream.
- **Scanning differs from docker-scan.** Docken continues into child directories after recognizing an image. Its scan results carry `attributes`, not image/group IDs.
- **Descriptor precedence.** `image.json` wins over `image-group.json`, then a bare `Dockerfile`. Group attributes are inherited and child descriptor fields overwrite matching parent fields.

## Contributing

Use the verified development commands in [the agent guide](AGENTS.md).

## License

Made with 💚

Published under the [MIT License](LICENSE).
