import { z } from 'zod';

import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number().int().min(0),
  });

  const pipe = new ZodValidationPipe(schema);

  it('should validate and transform valid input', async () => {
    const input = { name: 'John Doe', age: 30 };
    const result = await pipe.transform(input);

    expect(result).toEqual(input);
  });

  it('should throw a ZodError on invalid input', async () => {
    const invalidInput = { name: 'John Doe', age: -5 };

    await expect(pipe.transform(invalidInput)).rejects.toThrow(/Number must be greater than or equal to 0/);
  });

  it('should throw a ZodError on missing required fields', async () => {
    const invalidInput = { age: 25 };

    await expect(pipe.transform(invalidInput)).rejects.toThrow(/Required/);
  });
});
