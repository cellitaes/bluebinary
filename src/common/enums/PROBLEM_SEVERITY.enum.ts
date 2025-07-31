import { z } from 'zod';

export const PROBLEM_SEVERITY = z.enum(['low', 'medium', 'high']);

export type PROBLEM_SEVERITY = z.infer<typeof PROBLEM_SEVERITY>;
