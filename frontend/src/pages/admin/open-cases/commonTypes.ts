import type { FormattedCase } from '../../../features/timer/services/timerService';

export interface SystemStatus {
    system: string;
    status: string;
    [key: string]: any;
}

export interface OpenCase extends FormattedCase {
    id?: string | number;
    queueRecord?: { position: number };
}
