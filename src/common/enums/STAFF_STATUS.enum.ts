import { z } from 'zod';

export const STAFF_STATUS = z.enum(['sufficient', 'insufficient', 'excess']);

export type STAFF_STATUS = z.infer<typeof STAFF_STATUS>;
