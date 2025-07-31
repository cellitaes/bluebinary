import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  const mockJson = jest.fn();
  const mockStatus = jest.fn(() => ({ json: mockJson }));

  const mockGetResponse = jest.fn(() => ({ status: mockStatus }));
  const mockGetRequest = jest.fn(() => ({ url: '/test-path' }));

  const mockHost = {
    switchToHttp: () => ({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
    }),
  } as unknown as ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('should handle string-based error response', async () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    exception.stack = 'Stack trace here';

    await filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        timestamp: expect.any(String),
        path: '/test-path',
        message: 'Not Found',
      }),
    );
  });

  it('should handle object-based valid Zod error response', async () => {
    const exception = new HttpException({ message: ['Field is required'], code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
    exception.stack = 'Zod stack';

    await filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: '/test-path',
        message: ['Field is required'],
        code: 'VALIDATION_FAILED',
      }),
    );
  });

  it('should fallback to simple error if object error does not match schema', async () => {
    const exception = new HttpException({ wrong: 'data' }, HttpStatus.BAD_REQUEST);
    exception.stack = 'Faulty data stack';

    await filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: '/test-path',
        message: expect.any(String),
      }),
    );
  });
});
