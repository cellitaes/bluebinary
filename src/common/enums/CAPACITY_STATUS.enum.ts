import { z } from 'zod';

export const CAPACITY_STATUS = z.enum(['on-track', 'behind', 'ahead']);

export type CAPACITY_STATUS = z.infer<typeof CAPACITY_STATUS>;
