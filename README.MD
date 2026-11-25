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

dockerode hands you raw progress streams: build progress arrives as text lines, pull and push progress as status objects, and a failed build can still finish the stream, with the error only in its last chunk. Docken turns these streams into typed progress callbacks and a single rejection, and scans a directory of Dockerfiles into an image catalog.

| Concern | Without it | With it |
|---|---|---|
| Daemon client | Construct dockerode directly | Create a typed client with createClient |
| Build and pull streams | Decode completion and progress yourself | Await waitForStream with operation callbacks |
| Image operations | Wire build, pull and push streams yourself | Call buildImage, pullImage and pushImage and get the image id or digest |
| Daemon readiness | Write a ping retry loop | Await waitForDaemon |
| Local image catalog | Write a metadata-aware walker | Scan images and inherited group attributes, validate them, or get a group tree |

waitForStream delegates to the Docker modem, dispatches chunks to specific progress callbacks before generic callbacks, and resolves output or rejects the completion error. Callback promises are not awaited.

<img src=".github/assets/mechanism.svg" width="960" alt="waitForStream delegates to the Docker modem, dispatches chunks to specific progress callbacks before generic callbacks, and resolves output or rejects the completion error. Callback promises are not awaited." />

**Table of Contents**

- [Why Docken?](#why-docken)
- [Installation](#installation)
- [Usage](#usage)
  - [Daemon](#daemon)
  - [Images](#images)
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

Requires Node `>=24.0.0`. The package is ESM-only and includes TypeScript declarations. Import the documented package entrypoint rather than undeclared `dist/` paths.

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

`waitForDaemon(client, options)` pings the daemon until it answers, for example right after starting a container or a service. It retries `retries` times (default `10`) after the first failed ping, `interval` milliseconds apart (default `1000`), and then rejects with `The docker daemon is not reachable.` and the last ping error as `cause`. Pass a `signal` to stop waiting; the wait then rejects with the signal's reason.

```typescript
import { createClient, waitForDaemon } from 'docken';

const client = createClient();
await waitForDaemon(client, { retries: 30, interval: 500 });
```

### Images

`buildImage`, `pullImage` and `pushImage` start the daemon operation, await its progress stream and reject on failure. Each takes the same stream options as `waitForStream` as last argument, including `signal` and `timeout`.

```typescript
import { buildImage, createClient, pullImage, pushImage } from 'docken';

const client = createClient();

const { digest } = await pullImage(client, 'alpine:3.20', { platform: 'linux/amd64' });
const { imageId } = await buildImage(client, { context: './images/app', t: 'app:latest' }, {
    onBuilding: ({ percent }) => console.log(percent),
});
const { digest: pushed, size } = await pushImage(client, 'app:latest', { tag: 'latest' });
```

| Function | Input | Resolves |
|---|---|---|
| `pullImage(client, ref, { authconfig, platform }, options)` | Image reference | `{ digest }` |
| `pushImage(client, image, { authconfig, tag }, options)` | Image name or dockerode image | `{ digest, size }` |
| `buildImage(client, { context, ...buildOptions }, options)` | Directory or tar stream, plus dockerode build options | `{ imageId }` |

The resolved fields are `undefined` when the daemon does not report them.

For `buildImage`, a `context` directory is packed into a tar and honours its `.dockerignore`. The Dockerfile (`dockerfile` option, default `Dockerfile`) and `.dockerignore` are always sent, even when the patterns ignore them. Empty directories are not packed and symlinks are not followed. A `context` stream is passed through untouched.

### FS Scan

**Image:** a directory containing a `Dockerfile` or an `image.json` descriptor. A descriptor can replace the Dockerfile for discovery; scanning does not prove that the directory can be built.

**Group:** a directory containing `image-group.json`. Its descriptor attributes are inherited by descendant items and can be overridden by child descriptors.

**Metadata:** each discovered item has these fields:

| Field | Meaning |
|---|---|
| `path` | Path relative to the scan input context, always joined with `/`; a recognized root includes its directory name |
| `virtualPath` | Recognized group/image directory names joined with `/`; ordinary intermediate directories do not add a virtual segment |
| `attributes` | Optional descriptor fields, merged over inherited parent-group fields |

Unlike `docker-scan`, Docken does not interpret descriptor IDs as virtual path segments. Its `MetaFileName.GROUP` is `image-group.json`.

`scanDirectory(cwd, options)` and `scanDirectoryTree(cwd, options)` accept these options:

| Option | Meaning |
|---|---|
| `ignore` | Directory base names to skip. Defaults to `['.git', 'node_modules']`; passing a list replaces the default. It never applies to the scan root |
| `maxDepth` | Maximum depth; the root is `0`. Unlimited by default |
| `validate.image` / `validate.group` | Validator per item type, called with the merged attributes (inherited and own) and the item |

A validator's return value replaces the item's `attributes`, so it can parse and narrow them. The first failing validator rejects the scan with a `ScanValidationError` carrying the item `path`, its `type` and the thrown error as `cause`. Check it with `isScanValidationError`.

```typescript
import { isScanValidationError, scanDirectory } from 'docken';

try {
    const { images } = await scanDirectory('./images', {
        validate: { image: (attributes) => schema.parse(attributes) },
    });
} catch (error) {
    if (isScanValidationError(error)) {
        console.error(error.type, error.path, error.cause);
    }
}
```

`scanDirectoryTree(cwd, options)` returns the same items as a tree: each item has a `type` and `children`, and the items found below a group are nested in that group's `children`.

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

`readStream(client, stream, options)` (and `readModemStream(modem, stream, options)`) is the pull-based alternative: an async generator of typed events (`building`, `downloading`, `pushing`, `extracting`, `status`, `aux`, `output`, and the totals). The stream is consumed lazily: nothing is read, and `timeout` does not start, until the first `next()`. It accepts `signal` and `timeout`.

```typescript
import { readStream } from 'docken';

for await (const event of readStream(client, stream)) {
    if (event.kind === 'downloading') {
        console.log(event.progress.percent);
    }
}
```

| Callback | Receives |
|---|---|
| `onDownloading` / `onPushing` / `onBuilding` | `{ current, total, percent }` |
| `onExtracting` | `{ value, unit }` |
| `onStatusChunk` | An otherwise unhandled status chunk |
| `onStreamChunk` | Every textual stream chunk, including build step lines also reported to `onBuilding` (see `streamBuildSteps`) |
| `onChunk` | A chunk not handled by a more specific callback |
| `onDownloadingTotal` / `onPushingTotal` | `{ current, total, percent }` summed over all known layers |
| `onEvent` | Every typed stream event (the same events `readStream` yields), before the specific callback |
| `onFinished` | Successful completion notification, no arguments |

Set `streamBuildSteps: false` to keep chunks that contain only build step lines away from `onStreamChunk` and `onChunk` while `onBuilding` is registered; it defaults to `true`.

Callbacks are dispatched by specificity; a chunk handled by an operation callback is not also sent to every generic callback. `buildProgress(current, total)` floors the percentage and does not clamp it or guard a zero total.

The total callbacks are observational: they do not count as handling a chunk. The total percent can decrease, because layers that appear later add to the total.

### Failed streams

A failed stream rejects with a `ModemStreamError` whose `output` holds every line of the stream output and whose `cause` is the underlying error. The original error is available as `error.cause`; its `code`, `errno`, `syscall` and `statusCode` (e.g. a socket reset) are mirrored onto the `ModemStreamError` when present.

```typescript
import { isModemStreamError, waitForStream } from 'docken';

try {
    await waitForStream(client, buildStream);
} catch (error) {
    if (isModemStreamError(error)) {
        console.error(error.message, error.output);
    }
}
```

When the daemon reports a failure, `error.detail` carries its `errorDetail` (for example `code` and `message`).

### Cancellation

Pass `signal` and/or `timeout` (milliseconds) to `waitForStream`, `readStream` and the image functions. The stream is destroyed and the call rejects with a `ModemStreamError` where `aborted` is `true`; the original reason (an abort reason or `TimeoutError`) is its `cause`. `timeout` is rounded up to whole milliseconds, capped at `2 ** 31 - 1`, and ignored when not positive or not finite.

```typescript
try {
    await waitForStream(client, stream, { timeout: 60_000 });
} catch (error) {
    if (isModemStreamError(error) && error.aborted) {
        console.error('Gave up waiting');
    }
}
```

## Filesystem catalog

`scanDirectory(cwd, options)` returns `{ images, groups }`, sorted by case-insensitive path. Each item has `path`, optional `virtualPath` and optional `attributes`.

A group is marked by **`image-group.json`**. An image uses **`image.json`** or a **`Dockerfile`**. Descriptor files may stand in for a Dockerfile. Filesystem paths retain ordinary intermediate directories; virtual paths follow recognized groups/images. This is discovery, not Dockerfile validation or image building.

## API

All names below are exported from `docken`. Types have no runtime value.

| Export | Kind | Purpose |
|---|---|---|
| `isClient` | function | Check for a dockerode client instance |
| `waitForStream` | function | Await a client modem stream with progress callbacks |
| `ModemStreamError` | class | Rejection of a failed stream with `output` lines and the cause's error code |
| `isModemStreamError` | function | Check for a `ModemStreamError`, also across module copies |
| `createClient` | function | Construct a dockerode client |
| `Client` | type | Type contract for client |
| `ClientOptions` | type | Type contract for client options |
| `buildProgress` | function | Build current/total/floored-percent progress |
| `Progress` | type | Type contract for progress |
| `readStream` | function | Read a client modem stream as an async generator of typed events |
| `readModemStream` | function | Read a modem stream directly as an async generator of typed events |
| `ModemStreamEvent` | type | Union of typed stream events |
| `ModemOnEventFn` | type | Type contract for `onEvent` |
| `ModemStreamReadOptions` | type | `signal` and `timeout` options of `readStream` |
| `buildImage` | function | Build an image from a directory or tar stream, resolves `{ imageId }` |
| `pullImage` | function | Pull an image, resolves `{ digest }` |
| `pushImage` | function | Push an image, resolves `{ digest, size }` |
| `BuildImageInput` | type | Build options plus the `context` |
| `PullImageInput` | type | `authconfig` and `platform` |
| `PushImageInput` | type | `authconfig` and `tag` |
| `waitForDaemon` | function | Ping the daemon until it answers |
| `WaitForDaemonOptions` | type | `retries`, `interval` and `signal` |
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
| `readDirectoryMeta` | function | Read a directory's image/group type and own metadata attributes |
| `DirectoryMeta` | type | Type contract for a directory's type and own attributes |
| `scanDirectory` | function | Discover image and group directories recursively |
| `scanDirectoryTree` | function | Discover images and groups as a tree of groups |
| `ScanOptions` | type | `ignore`, `maxDepth` and `validate` options |
| `ScanTreeItem` | type | Scan item with `type` and `children` |
| `ScanValidationError` | class | Rejection of a failing validator, with `path`, `type` and `cause` |
| `isScanValidationError` | function | Check for a `ScanValidationError`, also across module copies |
| `sortScanResultItemsByPath` | function | Sort scan items in place by filesystem path |
| `ScanResultItem` | type | Type contract for scan result item |
| `ScanResult` | type | Type contract for scan result |

## Notes

- **Work in progress.** The project remains under active development and is not advertised as production-ready.
- **Daemon access is separate.** Constructing a client and scanning files do not require Docker access. Calling dockerode operations requires a reachable daemon and appropriate permissions.
- **Callbacks are not awaited.** Progress callback return promises do not delay stream completion. Handle asynchronous work and errors inside your own callbacks.
- **No retries.** Stream errors reject the returned promise and daemon operations are not retried; use `waitForDaemon` to wait for a daemon. `signal` and `timeout` destroy the stream.
- **Scanning differs from docker-scan.** Docken continues into child directories after recognizing an image. Its scan results carry `attributes`, not image/group IDs.
- **Descriptor precedence.** `image.json` wins over `image-group.json`, then a bare `Dockerfile`. Group attributes are inherited and child descriptor fields overwrite matching parent fields.

## Contributing

Use the verified development commands in [the agent guide](AGENTS.md).

## License

Made with 💚

Published under the [MIT License](LICENSE).
