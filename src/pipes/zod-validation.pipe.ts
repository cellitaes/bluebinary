import { PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private schema: ZodSchema<T>) {}

  public async transform(value: unknown): Promise<T> {
    const parsedValue: T = await this.schema.parseAsync(value);

    return parsedValue;
  }
}
