import { promises as fs } from 'fs';
import { join } from 'path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Config } from '../../../config';
import { ErrorCodes } from '../../../constants';
import { Coaster, Wagon } from '../../../schemas';
import { failure, Result, StandardError, success } from '../../types/response.type';
import { CustomLoggerService } from '../logger/logger.service';

@Injectable()
export class JsonStorageService {
  private dataPath: string;

  constructor(
    private configService: ConfigService<Config, true>,
    private logger: CustomLoggerService,
  ) {
    this.dataPath = this.configService.getOrThrow('DATA_PATH', { infer: true });
    void this.ensureDataDirectory();
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create data directory', error.stack, JsonStorageService.name);
    }
  }

  private getFilePath(filename: string): string {
    return join(this.dataPath, filename);
  }

  private async readJsonFile<T>(filename: string): Promise<T[]> {
    try {
      const filePath = this.getFilePath(filename);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as T[];
    } catch (error) {
      this.logger.error(`Failed to read ${filename}`, error.stack, JsonStorageService.name);
      return [];
    }
  }

  private async writeJsonFile<T>(filename: string, data: T[]): Promise<Result<T[], StandardError>> {
    try {
      const filePath = this.getFilePath(filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

      return success(data);
    } catch (error) {
      this.logger.error(`Failed to write ${filename}`, error.stack, JsonStorageService.name);

      return failure({ message: `Failed to write ${filename}`, code: ErrorCodes.FILE_WRITE_FAILED });
    }
  }

  private partitionById<T extends { id: string | number }>(items: T[], idsToRemove: (string | number)[]): { kept: T[]; removed: T[] } {
    const idSet = new Set(idsToRemove);

    return items.reduce(
      (acc, item) => {
        if (idSet.has(item.id)) {
          acc.removed.push(item);
        } else {
          acc.kept.push(item);
        }
        return acc;
      },
      { kept: [] as T[], removed: [] as T[] },
    );
  }

  public async getAllCoasters(): Promise<Coaster[]> {
    return this.readJsonFile<Coaster>('coasters.json');
  }

  public async getCoasterById(id: string): Promise<Coaster | null> {
    const coasters = await this.getAllCoasters();
    return coasters.find((coaster) => coaster.id === id) || null;
  }

  public async saveCoaster(coaster: Coaster): Promise<Coaster> {
    const coasters = await this.getAllCoasters();
    const existingIndex = coasters.findIndex((c) => c.id === coaster.id);

    if (existingIndex >= 0) {
      coasters[existingIndex] = coaster;
    } else {
      coasters.push(coaster);
    }

    const result = await this.writeJsonFile('coasters.json', coasters);

    if (!result.isSuccess) {
      throw new Error(`Failed to save coaster: ${result.error.message}`);
    }
    this.logger.logDataChange(existingIndex >= 0 ? 'UPDATE' : 'CREATE', 'coaster', coaster.id, coaster.nodeId);

    return coaster;
  }

  public async deleteCoaster(id: string): Promise<Coaster[] | null> {
    const coasters = await this.getAllCoasters();
    const initialLength = coasters.length;
    const { kept, removed } = this.partitionById(coasters, [id]);

    if (kept.length < initialLength) {
      const result = await this.writeJsonFile('coasters.json', kept);

      if (!result.isSuccess) {
        throw new Error(`Failed to delete coaster: ${result.error.message}`);
      }

      this.logger.logDataChange('DELETE', 'coaster', id, 'system');
      return removed;
    }

    return null;
  }

  public async getAllWagons(): Promise<Wagon[]> {
    return this.readJsonFile<Wagon>('wagons.json');
  }

  public async getWagonById(id: string): Promise<Wagon | null> {
    const wagons = await this.getAllWagons();

    return wagons.find((wagon) => wagon.id === id) || null;
  }

  public async getWagonsByCoasterId(coasterId: string): Promise<Wagon[]> {
    const wagons = await this.getAllWagons();

    return wagons.filter((wagon) => wagon.coasterId === coasterId);
  }

  public async saveWagon(wagon: Wagon): Promise<void> {
    const wagons = await this.getAllWagons();
    const existingIndex = wagons.findIndex((w) => w.id === wagon.id);

    if (existingIndex >= 0) {
      wagons[existingIndex] = wagon;
    } else {
      wagons.push(wagon);
    }

    const result = await this.writeJsonFile('wagons.json', wagons);

    if (!result.isSuccess) {
      throw new Error(`Failed to save wagon: ${result.error.message}`);
    }

    this.logger.logDataChange(existingIndex >= 0 ? 'UPDATE' : 'CREATE', 'wagon', wagon.id, wagon.nodeId);
  }

  public async deleteWagon(id: string): Promise<Wagon[] | null> {
    const wagons = await this.getAllWagons();
    const initialLength = wagons.length;
    const { kept, removed } = this.partitionById(wagons, [id]);

    if (kept.length < initialLength) {
      const result = await this.writeJsonFile('wagons.json', kept);

      if (!result.isSuccess) {
        throw new Error(`Failed to delete wagon: ${result.error.message}`);
      }

      this.logger.logDataChange('DELETE', 'wagon', id, 'system');
      return removed;
    }

    return null;
  }

  public async deleteWagonsByCoasterId(coasterId: string): Promise<number> {
    const wagons = await this.getAllWagons();
    const initialLength = wagons.length;
    const filteredWagons = wagons.filter((wagon) => wagon.coasterId !== coasterId);

    const deletedCount = initialLength - filteredWagons.length;
    if (deletedCount > 0) {
      await this.writeJsonFile('wagons.json', filteredWagons);
      this.logger.logDataChange('DELETE_BATCH', 'wagon', coasterId, 'system');
    }

    return deletedCount;
  }

  public async healthCheck(): Promise<Result<{ status: 'healthy'; details: unknown }, { status: 'unhealthy'; details: unknown }>> {
    try {
      const coasters = await this.getAllCoasters();
      const wagons = await this.getAllWagons();

      return success({
        status: 'healthy',
        details: {
          coastersCount: coasters.length,
          wagonsCount: wagons.length,
          dataPath: this.dataPath,
        },
      });
    } catch (error) {
      return failure({
        status: 'unhealthy',
        details: {
          error: error.message,
          dataPath: this.dataPath,
        },
      });
    }
  }
}
