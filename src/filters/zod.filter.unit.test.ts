import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { ZodError } from 'zod';

import { ErrorCodes } from '../constants';

import { ZodFilter } from './zod.filter';

jest.mock('../common/formatters', () => ({
  formatZodError: jest.fn().mockReturnValue('field1: Required, field2: Must be a string'),
}));

describe('ZodFilter', () => {
  let filter: ZodFilter<ZodError>;

  const mockJson = jest.fn();
  const mockStatus = jest.fn(() => ({ json: mockJson }));
  const mockGetResponse = jest.fn(() => ({ status: mockStatus }));
  const mockGetRequest = jest.fn(() => ({ url: '/test/url' }));

  const mockArgumentsHost = {
    switchToHttp: jest.fn(() => ({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
    })),
  } as unknown as ArgumentsHost;

  beforeEach(() => {
    filter = new ZodFilter<ZodError>();
    jest.clearAllMocks();
  });

  it('should format ZodError and return a structured response', () => {
    const zodError = new ZodError([]);

    filter.catch(zodError, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp: expect.any(String),
      path: '/test/url',
      message: 'field1: Required, field2: Must be a string',
      code: ErrorCodes.VALIDATION_ERROR,
    });
  });
});
