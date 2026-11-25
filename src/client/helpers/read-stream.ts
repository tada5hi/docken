/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ModemStreamReadOptions } from '../../modem';
import type { ModemStreamEvent } from '../../modem/reader';
import { readModemStream } from '../../modem';
import type { Client } from '../types';

export function readStream(
    client: Client,
    stream: NodeJS.ReadableStream,
    options?: ModemStreamReadOptions,
): AsyncGenerator<ModemStreamEvent, void, undefined> {
    return readModemStream(client.modem, stream, options);
}
