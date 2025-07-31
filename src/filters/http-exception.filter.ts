import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import dayjs from 'dayjs';
import { Request, Response } from 'express';
import { z } from 'zod';

const ErrorResponseSchema = z.object({
  message: z.union([z.string(), z.array(z.string())]),
  code: z.string().optional(),
});

const _ErrorShapeSchema = ErrorResponseSchema.extend({
  statusCode: z.number(),
  timestamp: z.string(),
  path: z.string(),
});

type ErrorShape = z.infer<typeof _ErrorShapeSchema>;

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  public async catch(exception: HttpException, host: ArgumentsHost): Promise<Response> {
    const ctx = host.switchToHttp();
    const httpResponse = ctx.getResponse<Response>();
    const httpRequest = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorData = exception.getResponse();

    const simpleError: ErrorShape = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: httpRequest.url,
      message: exception.message,
    };

    if (typeof errorData === 'string') {
      this.logger.error(exception.stack);
      return httpResponse.status(status).json(simpleError);
    }

    try {
      const parsedErrorData = await ErrorResponseSchema.parseAsync(errorData);

      const complexError: ErrorShape = {
        statusCode: status,
        timestamp: dayjs().toISOString(),
        path: httpRequest.url,
        message: parsedErrorData.message,
        code: parsedErrorData.code,
      };

      this.logger.error(exception.stack);
      return httpResponse.status(status).json(complexError);
    } catch (_e) {
      this.logger.error(`Failed to parse error data, url: ${httpRequest.url}`);
      return httpResponse.status(status).json(simpleError);
    }
  }
}
