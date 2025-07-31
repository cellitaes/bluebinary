import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import { Config } from '../../../config';
import { CoastersService } from '../../../modules/coasters/coasters.service';
import { ClusterStatus, SystemStatistics } from '../../../schemas';
import { CustomLoggerService } from '../logger/logger.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class StatisticsService {
  private nodeId: string;
  private currentStatistics: SystemStatistics | null = null;

  constructor(
    private configService: ConfigService<Config>,
    private logger: CustomLoggerService,
    private redisService: RedisService,
    private coasterService: CoastersService,
  ) {
    this.nodeId = this.configService.getOrThrow('NODE_ID');
  }

  public async getSystemStatistics(): Promise<SystemStatistics> {
    if (this.currentStatistics) {
      return this.currentStatistics;
    }

    return this.calculateSystemStatistics();
  }

  public async calculateSystemStatistics(): Promise<SystemStatistics> {
    const timestamp = new Date();

    const coasterStatistics = await this.coasterService.getAllCoasterStatistics();

    const clusterStatus = await this.calculateClusterStatus();

    const systemStats: SystemStatistics = {
      coasters: coasterStatistics,
      cluster: clusterStatus,
      timestamp,
    };

    this.currentStatistics = systemStats;
    return systemStats;
  }

  private async calculateClusterStatus(): Promise<ClusterStatus> {
    try {
      const allNodes = await this.redisService.getAllNodes();
      const currentLeader = await this.redisService.getCurrentLeader();

      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const activeNodes = Object.values(allNodes).filter((node) => {
        const lastHeartbeat = new Date(node.lastHeartbeat);
        return lastHeartbeat > twoMinutesAgo;
      });

      let syncStatus: 'healthy' | 'degraded' | 'offline' = 'healthy';
      if (!this.redisService.isRedisConnected()) {
        syncStatus = 'offline';
      } else if (activeNodes.length < Object.keys(allNodes).length * 0.8) {
        syncStatus = 'degraded';
      }

      return {
        activeNodes: activeNodes.length,
        totalNodes: Object.keys(allNodes).length,
        leaderId: currentLeader || 'none',
        syncStatus,
        lastSync: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to calculate cluster status', error.stack, 'StatisticsService');

      return {
        activeNodes: 1,
        totalNodes: 1,
        leaderId: this.nodeId,
        syncStatus: 'offline',
        lastSync: new Date(),
      };
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  public async updateStatistics(): Promise<void> {
    try {
      await this.calculateSystemStatistics();
      this.logger.debug('Statistics updated', 'StatisticsService');
    } catch (error) {
      this.logger.error('Failed to update statistics', error.stack, 'StatisticsService');
    }
  }

  public async displayConsoleStatistics(): Promise<void> {
    const stats = await this.getSystemStatistics();
    const output = this.formatConsoleOutput(stats);

    console.clear();
    console.log(output);
  }

  private formatConsoleOutput(stats: SystemStatistics): string {
    const timestamp = stats.timestamp.toLocaleTimeString('pl-PL');
    let output = `\n[Godzina ${timestamp}]\n`;

    stats.coasters.forEach((coaster) => {
      const statusIcon = this.getStatusIcon(coaster.overallStatus);
      const problemText = coaster.problems.length > 0 ? `\n   Problem: ${coaster.problems.map((p) => p.message).join(', ')}` : '';

      output += `
[${coaster.name}] ${statusIcon}
   Godziny działania: ${coaster.operatingHours.from} - ${coaster.operatingHours.to}
   Liczba wagonów: ${coaster.wagons.required}/${coaster.wagons.total}
   Dostępny personel: ${coaster.staff.available}/${coaster.staff.required}
   Klienci dziennie: ${coaster.capacity.dailyTarget}
   Wykorzystanie: ${coaster.capacity.utilizationRate.toFixed(1)}%
   Status: ${this.getStatusText(coaster.overallStatus)}${problemText}
`;
    });

    output += `
[Status Klastra]
   Aktywne węzły: ${stats.cluster.activeNodes}/${stats.cluster.totalNodes}
   Lider: ${stats.cluster.leaderId}
   Status synchronizacji: ${this.getSyncStatusText(stats.cluster.syncStatus)}
   Ostatnia synchronizacja: ${this.getTimeDifference(stats.cluster.lastSync)}
`;

    return output;
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'OK':
        return '✅';
      case 'WARNING':
        return '⚠️';
      case 'CRITICAL':
        return '❌';
      default:
        return '❓';
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'OK':
        return 'OK';
      case 'WARNING':
        return 'OSTRZEŻENIE';
      case 'CRITICAL':
        return 'KRYTYCZNY';
      default:
        return 'NIEZNANY';
    }
  }

  private getSyncStatusText(status: string): string {
    switch (status) {
      case 'healthy':
        return 'Zdrowy';
      case 'degraded':
        return 'Pogorszony';
      case 'offline':
        return 'Offline';
      default:
        return 'Nieznany';
    }
  }

  private getTimeDifference(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) {
      return `${diffSeconds}s temu`;
    } else if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `${minutes}m temu`;
    } else {
      const hours = Math.floor(diffSeconds / 3600);
      return `${hours}h temu`;
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  public async scheduleConsoleDisplay(): Promise<void> {
    await this.displayConsoleStatistics();
  }
}
