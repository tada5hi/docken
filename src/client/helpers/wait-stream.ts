/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ModemStreamWaitOptions } from '../../modem';
import { waitForModemStream } from '../../modem';
import type { Client } from '../types';

export async function waitForStream(
    client: Client,
    stream: NodeJS.ReadableStream,
    options?: ModemStreamWaitOptions,
): Promise<unknown> {
    return waitForModemStream(client.modem, stream, options);
}
