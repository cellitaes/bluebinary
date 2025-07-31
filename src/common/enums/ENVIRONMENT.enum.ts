import z from 'zod';

export const ENVIRONMENT = z.enum(['dev', 'prod', 'test']);

export type ENVIRONMENT = z.infer<typeof ENVIRONMENT>;
