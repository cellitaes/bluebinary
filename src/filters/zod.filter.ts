import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import dayjs from 'dayjs';
import { Request, Response } from 'express';
import { ZodError } from 'zod';

import { formatZodError } from '../common/formatters';
import { ErrorCodes } from '../constants';

@Catch(ZodError)
export class ZodFilter<T extends ZodError> implements ExceptionFilter {
  public catch(exception: T, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = HttpStatus.BAD_REQUEST;

    const formattedErrors = formatZodError(exception);

    response.status(status).json({
      statusCode: status,
      timestamp: dayjs().toISOString(),
      path: request.url,
      message: formattedErrors,
      code: ErrorCodes.VALIDATION_ERROR,
    });
  }
}
