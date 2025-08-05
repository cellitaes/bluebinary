import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

import { CapacityCalculatorService } from '../../common/services/calculators/capacity-calculator.service';
import { CustomLoggerService } from '../../common/services/logger/logger.service';
import { RedisService } from '../../common/services/redis/redis.service';
import { JsonStorageService } from '../../common/services/storages/json-storage.service';
import { Config } from '../../config';
import { Coaster, CoasterStatistics, CoasterWithWagons, CreateCoaster, CreateWagon, UpdateCoaster, UpdateWagon, Wagon } from '../../schemas';

@Injectable()
export class CoastersService {
  private nodeId: string;

  constructor(
    private configService: ConfigService<Config>,
    private storageService: JsonStorageService,
    private capacityCalculator: CapacityCalculatorService,
    private redisService: RedisService,
    private logger: CustomLoggerService,
  ) {
    this.nodeId = this.configService.getOrThrow('NODE_ID');
  }

  public async createCoaster(createCoasterDto: CreateCoaster): Promise<Coaster> {
    const coaster: Coaster = {
      id: uuidv4(),
      ...createCoasterDto,
      createdAt: new Date(),
      updatedAt: new Date(),
      nodeId: this.nodeId,
    };

    await this.storageService.saveCoaster(coaster);
    await this.publishSyncEvent('CREATE', 'coaster', coaster.id, coaster);

    this.logger.log(`Created coaster ${coaster.id}`, 'CoasterService');

    return coaster;
  }

  public async getAllCoasters(): Promise<Coaster[]> {
    return this.storageService.getAllCoasters();
  }

  public async getCoasterById(id: string): Promise<Coaster> {
    const coaster = await this.storageService.getCoasterById(id);

    if (!coaster) {
      throw new NotFoundException(`Coaster with ID ${id} not found`);
    }

    return coaster;
  }

  public async getCoasterWithWagons(id: string): Promise<CoasterWithWagons> {
    const coaster = await this.getCoasterById(id);
    const wagons = await this.storageService.getWagonsByCoasterId(id);

    return {
      ...coaster,
      wagons: wagons.map((wagon) => ({
        id: wagon.id,
        seatCount: wagon.seatCount,
        wagonSpeed: wagon.wagonSpeed,
        createdAt: wagon.createdAt,
        updatedAt: wagon.updatedAt,
      })),
    };
  }

  public async updateCoaster(id: string, updateCoasterDto: UpdateCoaster): Promise<Coaster> {
    const existingCoaster = await this.getCoasterById(id);

    if (updateCoasterDto.timeFrom && updateCoasterDto.timeTo) {
      const fromTime = updateCoasterDto.timeFrom.split(':').map(Number);
      const toTime = updateCoasterDto.timeTo.split(':').map(Number);
      const fromMinutes = fromTime[0] * 60 + fromTime[1];
      const toMinutes = toTime[0] * 60 + toTime[1];

      if (toMinutes <= fromMinutes) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    const updatedCoaster: Coaster = {
      ...existingCoaster,
      ...updateCoasterDto,
      updatedAt: new Date(),
      nodeId: this.nodeId,
    };

    await this.storageService.saveCoaster(updatedCoaster);

    this.logger.log(`Updated coaster ${id}`, CoastersService.name);

    return updatedCoaster;
  }

  public async deleteCoaster(id: string): Promise<Coaster[] | null> {
    const deletedWagonsCount = await this.storageService.deleteWagonsByCoasterId(id);

    const deleted = await this.storageService.deleteCoaster(id);

    if (!deleted) {
      throw new NotFoundException(`Coaster with ID ${id} not found`);
    }

    await this.publishSyncEvent('DELETE', 'coaster', id, {
      deletedWagonsCount,
    });

    this.logger.log(`Deleted coaster ${id} and ${deletedWagonsCount} associated wagons`, 'CoasterService');

    return deleted;
  }

  public async createWagon(coasterId: string, createWagonDto: CreateWagon): Promise<Wagon> {
    const wagon: Wagon = {
      id: uuidv4(),
      coasterId,
      ...createWagonDto,
      createdAt: new Date(),
      updatedAt: new Date(),
      nodeId: this.nodeId,
    };

    await this.storageService.saveWagon(wagon);
    await this.publishSyncEvent('CREATE', 'wagon', wagon.id, wagon);

    this.logger.log(`Created wagon ${wagon.id} for coaster ${coasterId}`, CoastersService.name);

    return wagon;
  }

  public async getWagonById(wagonId: string): Promise<Wagon> {
    const wagon = await this.storageService.getWagonById(wagonId);
    if (!wagon) {
      throw new NotFoundException(`Wagon with ID ${wagonId} not found`);
    }
    return wagon;
  }

  public async getWagonsByCoasterId(coasterId: string): Promise<Wagon[]> {
    return this.storageService.getWagonsByCoasterId(coasterId);
  }

  public async updateWagon(wagonId: string, updateWagonDto: UpdateWagon): Promise<Wagon> {
    const existingWagon = await this.getWagonById(wagonId);

    const updatedWagon: Wagon = {
      ...existingWagon,
      ...updateWagonDto,
      updatedAt: new Date(),
      nodeId: this.nodeId,
    };

    await this.storageService.saveWagon(updatedWagon);
    await this.publishSyncEvent('UPDATE', 'wagon', wagonId, updatedWagon);

    this.logger.log(`Updated wagon ${wagonId}`, CoastersService.name);

    return updatedWagon;
  }

  public async deleteWagon(coasterId: string, wagonId: string): Promise<Wagon[] | null> {
    const wagon = await this.getWagonById(wagonId);

    if (wagon.coasterId !== coasterId) {
      throw new BadRequestException(`Wagon ${wagonId} does not belong to coaster ${coasterId}`);
    }

    const deleted = await this.storageService.deleteWagon(wagonId);
    if (!deleted) {
      throw new NotFoundException(`Wagon with ID ${wagonId} not found`);
    }

    await this.publishSyncEvent('DELETE', 'wagon', wagonId, { coasterId });

    this.logger.log(`Deleted wagon ${wagonId} from coaster ${coasterId}`, CoastersService.name);

    return deleted;
  }

  public async getCoasterStatistics(coasterId: string): Promise<CoasterStatistics> {
    const coaster = await this.getCoasterById(coasterId);
    const wagons = await this.getWagonsByCoasterId(coasterId);
    const currentTime = new Date();

    const operatingHours = this.calculateOperatingHours(coaster.timeFrom, coaster.timeTo, currentTime);

    const wagonStats = this.capacityCalculator.calculateWagonStatistics(coaster, wagons);
    const staffStats = this.capacityCalculator.calculateStaffStatistics(coaster, wagons);
    const capacityStats = this.capacityCalculator.calculateCapacityStatistics(coaster, wagons);

    const problems = this.capacityCalculator.detectProblems(wagonStats, staffStats, capacityStats);

    const overallStatus = this.capacityCalculator.determineOverallStatus(problems);

    const statistics: CoasterStatistics = {
      coasterId: coaster.id,
      name: `Kolejka ${coaster.id.substring(0, 8)}`,
      operatingHours,
      wagons: wagonStats,
      staff: staffStats,
      capacity: capacityStats,
      problems,
      overallStatus,
      lastUpdated: currentTime,
    };

    this.logger.logStatistics(coasterId, statistics);

    return statistics;
  }

  public async getAllCoasterStatistics(): Promise<CoasterStatistics[]> {
    const coasters = await this.getAllCoasters();
    const statistics = await Promise.all(coasters.map((coaster) => this.getCoasterStatistics(coaster.id)));

    return statistics;
  }

  private calculateOperatingHours(fromTime: string, toTime: string, currentTime: Date) {
    const [fromHour, fromMinute] = fromTime.split(':').map(Number);
    const [toHour, toMinute] = toTime.split(':').map(Number);

    const totalMinutes = toHour * 60 + toMinute - (fromHour * 60 + fromMinute);

    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const fromTotalMinutes = fromHour * 60 + fromMinute;
    const toTotalMinutes = toHour * 60 + toMinute;

    let remainingMinutes = 0;
    if (currentTotalMinutes >= fromTotalMinutes && currentTotalMinutes < toTotalMinutes) {
      remainingMinutes = toTotalMinutes - currentTotalMinutes;
    } else if (currentTotalMinutes < fromTotalMinutes) {
      remainingMinutes = totalMinutes;
    }

    return {
      from: fromTime,
      to: toTime,
      totalMinutes,
      remainingMinutes,
    };
  }

  private async publishSyncEvent(operation: 'CREATE' | 'UPDATE' | 'DELETE', entityType: 'coaster' | 'wagon', entityId: string, data: any): Promise<void> {
    const currentVersion = await this.redisService.getEntityVersion(entityType, entityId);

    const syncEvent = {
      eventId: uuidv4(),
      nodeId: this.nodeId,
      timestamp: new Date(),
      operation,
      entityType,
      entityId,
      data,
      version: currentVersion,
    };

    const submitted = await this.redisService.submitChangeToLeader(syncEvent);

    if (!submitted) {
      this.logger.warn(`Failed to submit ${operation} ${entityType} ${entityId} to leader`, 'CoasterService');
    }
  }
}
