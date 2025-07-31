import { Injectable } from '@nestjs/common';

import { CapacityStats, Coaster, Problem, StaffStats, Wagon, WagonStats } from '../../../schemas';
import { CAPACITY_STATUS, COASTER_OVERALL_STATUS, STAFF_STATUS, WAGON_STATUS } from '../../enums';

@Injectable()
export class CapacityCalculatorService {
  constructor() {}

  public calculateWagonStatistics(coaster: Coaster, wagons: Wagon[]): WagonStats {
    const totalWagons = wagons.length;
    const requiredWagons = this.calculateRequiredWagons(coaster, wagons);

    return {
      total: totalWagons,
      required: requiredWagons,
      status: this.determineWagonStatus(totalWagons, requiredWagons),
    };
  }

  public calculateStaffStatistics(coaster: Coaster, wagons: Wagon[]): StaffStats {
    const coasterStaffRequired = 1;
    const wagonStaffRequired = wagons.length * 2;
    const totalRequired = coasterStaffRequired + wagonStaffRequired;

    return {
      available: coaster.staffCount,
      required: totalRequired,
      status: this.determineStaffStatus(coaster.staffCount, totalRequired),
      breakdown: {
        coasterStaff: coasterStaffRequired,
        wagonStaff: wagonStaffRequired,
      },
    };
  }

  public calculateCapacityStatistics(coaster: Coaster, wagons: Wagon[]): CapacityStats {
    const dailyCapacity = this.calculateDailyCapacity(coaster, wagons);
    const utilizationRate = (dailyCapacity / coaster.dailyClientCount) * 100;

    return {
      dailyTarget: coaster.dailyClientCount,
      currentCapacity: dailyCapacity,
      utilizationRate,
      status: this.determineCapacityStatus(dailyCapacity, coaster.dailyClientCount),
    };
  }

  public calculateDailyCapacity(coaster: Coaster, wagons: Wagon[]): number {
    if (wagons.length === 0) return 0;

    const operatingMinutes = this.getOperatingMinutes(coaster.timeFrom, coaster.timeTo);
    const trackTimeMinutes = this.calculateTrackTime(coaster.trackLength, wagons);
    const breakTimeMinutes = 5;
    const cycleTimeMinutes = trackTimeMinutes + breakTimeMinutes;

    const cyclesPerWagon = Math.floor(operatingMinutes / cycleTimeMinutes);

    const totalCapacity = wagons.reduce((total, wagon) => {
      return total + wagon.seatCount * cyclesPerWagon;
    }, 0);

    return totalCapacity;
  }

  private getOperatingMinutes(fromTime: string, toTime: string): number {
    const [fromHour, fromMinute] = fromTime.split(':').map(Number);
    const [toHour, toMinute] = toTime.split(':').map(Number);

    const fromMinutes = fromHour * 60 + fromMinute;
    const toMinutes = toHour * 60 + toMinute;

    return toMinutes - fromMinutes;
  }

  private calculateTrackTime(trackLength: number, wagons: Wagon[]): number {
    if (wagons.length === 0) return 0;

    const avgSpeed = wagons.reduce((sum, wagon) => sum + wagon.wagonSpeed, 0) / wagons.length;

    return trackLength / avgSpeed / 60;
  }

  private calculateRequiredWagons(coaster: Coaster, wagons: Wagon[]): number {
    if (wagons.length === 0) return 1;

    const operatingMinutes = this.getOperatingMinutes(coaster.timeFrom, coaster.timeTo);
    const avgSeatsPerWagon = wagons.reduce((sum, wagon) => sum + wagon.seatCount, 0) / wagons.length;
    const trackTimeMinutes = this.calculateTrackTime(coaster.trackLength, wagons);
    const cycleTimeMinutes = trackTimeMinutes + 5;

    const cyclesPerDay = Math.floor(operatingMinutes / cycleTimeMinutes);
    const capacityPerWagon = avgSeatsPerWagon * cyclesPerDay;

    return Math.ceil(coaster.dailyClientCount / capacityPerWagon);
  }

  private determineWagonStatus(available: number, required: number): WAGON_STATUS {
    if (available < required) return WAGON_STATUS.Values.insufficient;
    if (available > required) return WAGON_STATUS.Values.excess;

    return WAGON_STATUS.Values.sufficient;
  }

  private determineStaffStatus(available: number, required: number): STAFF_STATUS {
    if (available < required) return STAFF_STATUS.Values.insufficient;
    if (available > required) return STAFF_STATUS.Values.excess;

    return STAFF_STATUS.Values.sufficient;
  }

  private determineCapacityStatus(currentCapacity: number, targetCapacity: number): CAPACITY_STATUS {
    const utilizationRate = (currentCapacity / targetCapacity) * 100;

    if (utilizationRate < 80) return CAPACITY_STATUS.Values.behind;
    if (utilizationRate > 200) return CAPACITY_STATUS.Values.ahead;

    return CAPACITY_STATUS.Values['on-track'];
  }

  public detectProblems(wagonStats: WagonStats, staffStats: StaffStats, capacityStats: CapacityStats): Problem[] {
    const problems: Problem[] = [];

    if (staffStats.status === 'insufficient') {
      problems.push({
        type: 'staff',
        severity: 'high',
        message: `Brakuje ${staffStats.required - staffStats.available} pracowników`,
        details: { missing: staffStats.required - staffStats.available },
      });
    } else if (staffStats.status === 'excess') {
      problems.push({
        type: 'staff',
        severity: 'low',
        message: `Nadmiar ${staffStats.available - staffStats.required} pracowników`,
        details: { excess: staffStats.available - staffStats.required },
      });
    }

    if (wagonStats.status === 'insufficient') {
      problems.push({
        type: 'wagons',
        severity: 'medium',
        message: `Brak ${wagonStats.required - wagonStats.total} wagonów`,
        details: { missing: wagonStats.required - wagonStats.total },
      });
    } else if (wagonStats.status === 'excess') {
      problems.push({
        type: 'wagons',
        severity: 'low',
        message: `Nadmiar ${wagonStats.total - wagonStats.required} wagonów`,
        details: { excess: wagonStats.total - wagonStats.required },
      });
    }

    if (capacityStats.status === 'behind') {
      problems.push({
        type: 'capacity',
        severity: 'medium',
        message: `Niska wykorzystanie mocy przerobowych (${capacityStats.utilizationRate.toFixed(1)}%)`,
        details: { utilizationRate: capacityStats.utilizationRate },
      });
    } else if (capacityStats.status === 'ahead') {
      problems.push({
        type: 'capacity',
        severity: 'low',
        message: `Nadmiarowa moc przerobowa (${capacityStats.utilizationRate.toFixed(1)}%)`,
        details: { utilizationRate: capacityStats.utilizationRate },
      });
    }

    return problems;
  }

  public determineOverallStatus(problems: Problem[]): COASTER_OVERALL_STATUS {
    if (problems.length === 0) return COASTER_OVERALL_STATUS.Values.OK;

    const hasHighSeverity = problems.some((p) => p.severity === 'high');
    const hasMediumSeverity = problems.some((p) => p.severity === 'medium');

    if (hasHighSeverity) return COASTER_OVERALL_STATUS.Values.CRITICAL;
    if (hasMediumSeverity) return COASTER_OVERALL_STATUS.Values.WARNING;

    return COASTER_OVERALL_STATUS.Values.OK;
  }
}
