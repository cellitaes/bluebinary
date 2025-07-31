import { z } from 'zod';

import { CAPACITY_STATUS, COASTER_OVERALL_STATUS, PROBLEM_SEVERITY, PROBLEM_TYPE, STAFF_STATUS, SYNC_STATUS, WAGON_STATUS } from '../common/enums';

export const ProblemSchema = z.object({
  type: PROBLEM_TYPE,
  severity: PROBLEM_SEVERITY,
  message: z.string(),
  details: z.record(z.any()).optional(),
});

export const OperatingHoursSchema = z.object({
  from: z.string(),
  to: z.string(),
  totalMinutes: z.number(),
  remainingMinutes: z.number(),
});

export const WagonStatsSchema = z.object({
  total: z.number(),
  required: z.number(),
  status: WAGON_STATUS,
});

export const StaffStatsSchema = z.object({
  available: z.number(),
  required: z.number(),
  status: STAFF_STATUS,
  breakdown: z.object({
    coasterStaff: z.number(),
    wagonStaff: z.number(),
  }),
});

export const CapacityStatsSchema = z.object({
  dailyTarget: z.number(),
  currentCapacity: z.number(),
  utilizationRate: z.number(),
  status: CAPACITY_STATUS,
});

export const CoasterStatisticsSchema = z.object({
  coasterId: z.string().uuid(),
  name: z.string(),
  operatingHours: OperatingHoursSchema,
  wagons: WagonStatsSchema,
  staff: StaffStatsSchema,
  capacity: CapacityStatsSchema,
  problems: z.array(ProblemSchema),
  overallStatus: COASTER_OVERALL_STATUS,
  lastUpdated: z.date(),
});

export const ClusterStatusSchema = z.object({
  activeNodes: z.number(),
  totalNodes: z.number(),
  leaderId: z.string(),
  syncStatus: SYNC_STATUS,
  lastSync: z.date(),
});

export const SystemStatisticsSchema = z.object({
  coasters: z.array(CoasterStatisticsSchema),
  cluster: ClusterStatusSchema,
  timestamp: z.date(),
});

export type Problem = z.infer<typeof ProblemSchema>;
export type OperatingHours = z.infer<typeof OperatingHoursSchema>;
export type WagonStats = z.infer<typeof WagonStatsSchema>;
export type StaffStats = z.infer<typeof StaffStatsSchema>;
export type CapacityStats = z.infer<typeof CapacityStatsSchema>;
export type CoasterStatistics = z.infer<typeof CoasterStatisticsSchema>;
export type ClusterStatus = z.infer<typeof ClusterStatusSchema>;
export type SystemStatistics = z.infer<typeof SystemStatisticsSchema>;
