import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';

import { LoggerMiddleware } from './logger.middleware';

describe('LoggerMiddleware', () => {
  const mockRequest = {
    method: 'GET',
    originalUrl: '/test-endpoint',
  } as Request;

  const mockResponse = {} as Response;
  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log the method and URL', () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    const middleware = new LoggerMiddleware();
    middleware.use(mockRequest, mockResponse, mockNext);

    expect(loggerSpy).toHaveBeenCalledWith('GET /test-endpoint');
    expect(mockNext).toHaveBeenCalled();
  });
});
