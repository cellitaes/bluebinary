import { z } from 'zod';

export const SYNC_STATUS = z.enum(['healthy', 'degraded', 'offline']);

export type SYNC_STATUS = z.infer<typeof SYNC_STATUS>;
