import { z } from 'zod';

export const COASTER_OVERALL_STATUS = z.enum(['OK', 'WARNING', 'CRITICAL']);

export type COASTER_OVERALL_STATUS = z.infer<typeof COASTER_OVERALL_STATUS>;
