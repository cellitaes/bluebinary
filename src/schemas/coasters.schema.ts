import { z } from 'zod';

const timeSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
  message: 'Time must be in HH:MM format',
});

export const CreateCoasterSchema = z
  .object({
    staffCount: z.number().int().min(1, 'Staff count must be at least 1'),
    dailyClientCount: z.number().int().min(1, 'Daily client count must be at least 1'),
    trackLength: z.number().positive('Track length must be positive'),
    timeFrom: timeSchema,
    timeTo: timeSchema,
  })
  .refine(
    (data) => {
      const fromTime = data.timeFrom.split(':').map(Number);
      const toTime = data.timeTo.split(':').map(Number);
      const fromMinutes = fromTime[0] * 60 + fromTime[1];
      const toMinutes = toTime[0] * 60 + toTime[1];
      return toMinutes > fromMinutes;
    },
    {
      message: 'End time must be after start time',
      path: ['timeTo'],
    },
  );

export const UpdateCoasterSchema = z
  .object({
    staffCount: z.number().int().min(1).optional(),
    dailyClientCount: z.number().int().min(1).optional(),
    timeFrom: timeSchema.optional(),
    timeTo: timeSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.timeFrom && data.timeTo) {
        const fromTime = data.timeFrom.split(':').map(Number);
        const toTime = data.timeTo.split(':').map(Number);
        const fromMinutes = fromTime[0] * 60 + fromTime[1];
        const toMinutes = toTime[0] * 60 + toTime[1];
        return toMinutes > fromMinutes;
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['timeTo'],
    },
  );

export const CoasterSchema = z.object({
  id: z.string().uuid(),
  staffCount: z.number().int().min(1),
  dailyClientCount: z.number().int().min(1),
  trackLength: z.number().positive(),
  timeFrom: timeSchema,
  timeTo: timeSchema,
  // wagons: z.array(z.string().uuid()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
  nodeId: z.string(),
});

export const CoasterWithWagonsSchema = CoasterSchema.extend({
  wagons: z.array(
    z.object({
      id: z.string().uuid(),
      seatCount: z.number().int().min(1),
      wagonSpeed: z.number().positive(),
      createdAt: z.date(),
      updatedAt: z.date(),
    }),
  ),
});

export type CreateCoaster = z.infer<typeof CreateCoasterSchema>;
export type UpdateCoaster = z.infer<typeof UpdateCoasterSchema>;

export type Coaster = z.infer<typeof CoasterSchema>;
export type CoasterWithWagons = z.infer<typeof CoasterWithWagonsSchema>;
