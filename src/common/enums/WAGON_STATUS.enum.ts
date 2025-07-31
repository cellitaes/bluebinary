import { z } from 'zod';

export const WAGON_STATUS = z.enum(['sufficient', 'insufficient', 'excess']);

export type WAGON_STATUS = z.infer<typeof WAGON_STATUS>;
