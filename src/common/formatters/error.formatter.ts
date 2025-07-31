import { z, ZodError, ZodSchema } from 'zod';

import { ErrorCodes } from '../../constants';
import { failure, Result, StandardError, success } from '../types/response.type';

export function formatZodError(error: ZodError): string {
  return error.errors
    .map((e) => {
      const path = e.path.length ? e.path.join(' -> ') : '(root)';
      return `${path}: ${e.message}`;
    })
    .join(', ');
}

export function validateSchema<T extends ZodSchema<unknown>>(schema: T, data: unknown): Result<z.infer<typeof schema>, StandardError> {
  const result = schema.safeParse(data);

  if (result.success) {
    return success(result.data);
  }
  const errorMessage = formatZodError(result.error);

  return failure({
    message: errorMessage,
    code: ErrorCodes.VALIDATION_ERROR,
  });
}
