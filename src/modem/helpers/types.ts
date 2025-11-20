/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Progress } from '../../helpers';
import type { ObjectLiteral } from '../../types';
import type { ModemStatusChunk, ModemStreamChunk } from '../utils';

export {
    ModemStatusChunk,
    ModemStreamChunk,
};

export type ModemStreamWaitOptions = {
    onFinished?: () => void,
    onChunk?: (input: ObjectLiteral) => void | Promise<void>,
    onStreamChunk?: (input: ModemStreamChunk) => void | Promise<void>,
    onStatusChunk?: (input: ModemStatusChunk) => void | Promise<void>,

    onPushing?: (input: Progress) => void | Promise<void>,
    onDownloading?: (input: Progress) => void | Promise<void>,
    onExtracting?: (current: number, units: string) => void | Promise<void>,
    onBuilding?: (input: Progress) => void | Promise<void>,
};
