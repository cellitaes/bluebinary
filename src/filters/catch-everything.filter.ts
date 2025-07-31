import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import dayjs from 'dayjs';

import { ErrorCodes, Messages } from '../constants';

@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  public catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const httpStatus = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = {
      statusCode: httpStatus,
      timestamp: dayjs().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      message: exception instanceof Error ? exception.message : Messages.UNEXPECTED_ERROR,
      error: exception instanceof Error ? exception.name : ErrorCodes.UNEXPECTED_ERROR,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
