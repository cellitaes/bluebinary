import { z } from "zod";

import { ErrorCodes } from "../../constants";

import { validateSchema, formatZodError } from "./error.formatter";

describe("error formatter", () => {
  describe("validateSchema", () => {
    const testSchema = z.object({
      id: z.number(),
      name: z.string(),
      optionalField: z.string().optional(),
    });

    it("should return success when data is valid", () => {
      const validData = {
        id: 1,
        name: "Test",
      };

      const result = validateSchema(testSchema, validData);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should return failure when data is invalid", () => {
      const invalidData = {
        id: "not-a-number",
        name: 123,
      };

      const result = validateSchema(testSchema, invalidData);

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
        expect(result.error.message).toMatch(
          /id: Expected number, received string/
        );
        expect(result.error.message).toMatch(
          /name: Expected string, received number/
        );
      }
    });

    it("should include (root) in error message when path is empty", () => {
      const rootSchema = z.string();
      const result = validateSchema(rootSchema, 123);

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toMatch(
          /\(root\): Expected string, received number/
        );
      }
    });
  });

  describe("formatZodError", () => {
    it("should format nested ZodError messages correctly", () => {
      const nestedSchema = z.object({
        user: z.object({
          email: z.string().email(),
        }),
      });

      const result = nestedSchema.safeParse({
        user: { email: "invalid-email" },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toMatch(/user -> email: Invalid email/);
      }
    });
  });
});
