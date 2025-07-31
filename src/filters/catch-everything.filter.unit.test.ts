import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { ErrorCodes, Messages } from '../constants';

import { CatchEverythingFilter } from './catch-everything.filter';

describe('CatchEverythingFilter', () => {
  let filter: CatchEverythingFilter;
  let httpAdapterHost: HttpAdapterHost;

  const mockReply = jest.fn();
  const mockGetRequestUrl = jest.fn(() => '/mock-url');

  const mockHttpAdapter = {
    reply: mockReply,
    getRequestUrl: mockGetRequestUrl,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    httpAdapterHost = {
      httpAdapter: mockHttpAdapter as unknown,
    } as HttpAdapterHost;
    filter = new CatchEverythingFilter(httpAdapterHost);
  });

  const createMockArgumentsHost = (requestUrl: string = '/test-path'): ArgumentsHost => {
    const mockGetResponse = jest.fn();
    const mockGetRequest = jest.fn(() => ({ url: requestUrl }));

    return {
      switchToHttp: () => ({
        getResponse: mockGetResponse,
        getRequest: mockGetRequest,
      }),
    } as unknown as ArgumentsHost;
  };

  it('should catch and handle HttpException', () => {
    const mockHttpStatus = HttpStatus.BAD_REQUEST;
    const mockMessage = 'Validation Failed';
    const exception = new HttpException(mockMessage, mockHttpStatus);
    const mockHost = createMockArgumentsHost();

    filter.catch(exception, mockHost);

    expect(mockGetRequestUrl).toHaveBeenCalledWith(mockHost.switchToHttp().getRequest());
    expect(mockReply).toHaveBeenCalledWith(
      mockHost.switchToHttp().getResponse(),
      {
        statusCode: mockHttpStatus,
        timestamp: expect.any(String),
        path: '/mock-url',
        message: mockMessage,
        error: 'HttpException',
      },
      mockHttpStatus,
    );
  });

  it('should catch and handle a generic Error', () => {
    const errorMessage = 'Something went wrong!';
    const exception = new Error(errorMessage);
    exception.name = 'CustomError';
    const mockHost = createMockArgumentsHost();

    filter.catch(exception, mockHost);

    expect(mockGetRequestUrl).toHaveBeenCalledWith(mockHost.switchToHttp().getRequest());
    expect(mockReply).toHaveBeenCalledWith(
      mockHost.switchToHttp().getResponse(),
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/mock-url',
        message: errorMessage,
        error: 'CustomError',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('should catch and handle an unknown exception type (string or number)', () => {
    const unknownException = 'Just a string error';
    const mockHost = createMockArgumentsHost();

    filter.catch(unknownException, mockHost);

    expect(mockGetRequestUrl).toHaveBeenCalledWith(mockHost.switchToHttp().getRequest());
    expect(mockReply).toHaveBeenCalledWith(
      mockHost.switchToHttp().getResponse(),
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/mock-url',
        message: Messages.UNEXPECTED_ERROR,
        error: ErrorCodes.UNEXPECTED_ERROR,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('should correctly set status to INTERNAL_SERVER_ERROR for non-HttpException', () => {
    const exception = { code: 123, someOtherProp: 'data' };
    const mockHost = createMockArgumentsHost();

    filter.catch(exception, mockHost);

    expect(mockGetRequestUrl).toHaveBeenCalledWith(mockHost.switchToHttp().getRequest());
    expect(mockReply).toHaveBeenCalledWith(
      mockHost.switchToHttp().getResponse(),
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: Messages.UNEXPECTED_ERROR,
        error: ErrorCodes.UNEXPECTED_ERROR,
      }),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });
});
