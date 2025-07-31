import { z } from 'zod';

export const CreateWagonSchema = z.object({
  seatCount: z.number().int().min(1, 'Seat count must be at least 1'),
  wagonSpeed: z.number().positive('Wagon speed must be positive'),
});

export const UpdateWagonSchema = z.object({
  seatCount: z.number().int().min(1).optional(),
  wagonSpeed: z.number().positive().optional(),
});

export const WagonSchema = z.object({
  id: z.string().uuid(),
  coasterId: z.string().uuid(),
  seatCount: z.number().int().min(1),
  wagonSpeed: z.number().positive(),
  lastTripEndTime: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  nodeId: z.string(),
});

export type CreateWagon = z.infer<typeof CreateWagonSchema>;
export type UpdateWagon = z.infer<typeof UpdateWagonSchema>;
export type Wagon = z.infer<typeof WagonSchema>;
