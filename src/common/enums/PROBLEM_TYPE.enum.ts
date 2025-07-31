import { z } from 'zod';

export const PROBLEM_TYPE = z.enum(['staff', 'wagons', 'capacity', 'operational']);

export type PROBLEM_TYPE = z.infer<typeof PROBLEM_TYPE>;
