import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import { Config } from '../../../config';
import { CustomLoggerService } from '../logger/logger.service';
import { RedisService } from '../redis/redis.service';
import { JsonStorageService } from '../storages/json-storage.service';

import { NodeInfo, SyncEvent } from './distributed-coordinator.type';

@Injectable()
export class DistributedCoordinatorService implements OnModuleInit, OnModuleDestroy {
  private nodeId: string;
  private isLeader = false;
  private isInitialized = false;
  private heartbeatInterval: NodeJS.Timeout;
  private leadershipInterval: NodeJS.Timeout;
  private syncInterval: NodeJS.Timeout;
  private leaderProcessingInterval: NodeJS.Timeout;
  private lastSyncTimestamp: Date = new Date(0);

  constructor(
    private configService: ConfigService<Config>,
    private logger: CustomLoggerService,
    private redisService: RedisService,
    private storageService: JsonStorageService,
  ) {
    this.nodeId = this.configService.getOrThrow('NODE_ID');
  }

  public async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.cleanup();
  }

  private async initialize(): Promise<void> {
    try {
      await this.registerNode();

      void this.heartbeatJob();
      void this.leadershipManagementJob();
      void this.syncProcessingJob();
      void this.leaderProcessingJob();

      this.isInitialized = true;
      this.logger.log(`Distributed coordinator initialized for node ${this.nodeId}`, DistributedCoordinatorService.name);
    } catch (error) {
      this.logger.error('Failed to initialize distributed coordinator', error.stack, DistributedCoordinatorService.name);
    }
  }

  private async cleanup(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.leadershipInterval) {
      clearInterval(this.leadershipInterval);
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.leaderProcessingInterval) {
      clearInterval(this.leaderProcessingInterval);
    }

    await this.redisService.removeNode(this.nodeId);

    this.logger.log(`Distributed coordinator cleaned up for node ${this.nodeId}`, DistributedCoordinatorService.name);
  }

  private async registerNode(): Promise<void> {
    const nodeInfo: NodeInfo = {
      nodeId: this.nodeId,
      ipAddress: this.configService.getOrThrow('REDIS_HOST'),
      port: this.configService.getOrThrow('PORT'),
      environment: this.configService.getOrThrow('NODE_ENV'),
      lastHeartbeat: new Date(),
      isLeader: false,
      status: 'online',
    };

    await this.redisService.registerNode(this.nodeId, nodeInfo);
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  private async heartbeatJob(): Promise<void> {
    try {
      await this.redisService.updateHeartbeat(this.nodeId);
      await this.cleanupDeadNodes();
    } catch (error) {
      this.logger.error('Heartbeat failed', error.stack, DistributedCoordinatorService.name);
    }
  }

  @Cron('*/20 * * * * *')
  private async leadershipManagementJob(): Promise<void> {
    try {
      if (this.isLeader) {
        const renewed = await this.redisService.renewLeadership(this.nodeId);
        if (!renewed) {
          this.isLeader = false;
          this.logger.warn('Lost leadership', DistributedCoordinatorService.name);
        }
      } else {
        const becameLeader = await this.redisService.tryBecomeLeader(this.nodeId);
        if (becameLeader) {
          this.isLeader = true;
          this.logger.log('Became cluster leader', DistributedCoordinatorService.name);
        }
      }
    } catch (error) {
      this.logger.error('Leadership management failed', error.stack, DistributedCoordinatorService.name);
    }
  }

  @Cron('*/5 * * * * *')
  private async syncProcessingJob(): Promise<void> {
    try {
      if (!this.isLeader) {
        await this.processSyncEvents();
      }
    } catch (error) {
      this.logger.error('Sync processing failed', error.stack, DistributedCoordinatorService.name);
    }
  }

  @Cron('*/3 * * * * *')
  private async leaderProcessingJob(): Promise<void> {
    try {
      if (this.isLeader) {
        await this.processLeaderQueue();
      }
    } catch (error) {
      this.logger.error('Leader processing failed', error.stack, DistributedCoordinatorService.name);
    }
  }

  private async cleanupDeadNodes(): Promise<void> {
    const allNodes = await this.redisService.getAllNodes();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    for (const [nodeId, nodeInfo] of Object.entries(allNodes)) {
      const lastHeartbeat = new Date(nodeInfo.lastHeartbeat);
      if (lastHeartbeat < fiveMinutesAgo) {
        await this.redisService.removeNode(nodeId);
        this.logger.log(`Removed dead node: ${nodeId}`, DistributedCoordinatorService.name);
      }
    }
  }

  private async processSyncEvents(): Promise<void> {
    const events = await this.redisService.getSyncEvents(10);

    for (const event of events) {
      if (event.nodeId === this.nodeId) {
        continue;
      }

      if (event.timestamp <= this.lastSyncTimestamp) {
        continue;
      }

      if (event.processedBy && event.processedBy.includes(this.nodeId)) {
        continue;
      }

      try {
        await this.applySyncEvent(event);
        await this.redisService.markEventProcessed(event.eventId, this.nodeId);
        this.lastSyncTimestamp = event.timestamp;
        this.logger.debug(`Applied sync event: ${event.operation} ${event.entityType} ${event.entityId}`, DistributedCoordinatorService.name);
      } catch (error) {
        this.logger.error(`Failed to apply sync event: ${event.eventId}`, error.stack, DistributedCoordinatorService.name);
      }
    }
  }

  private async processLeaderQueue(): Promise<void> {
    const events = await this.redisService.getLeaderQueue(this.nodeId, 10);

    for (const event of events) {
      try {
        const resolvedEvent = await this.resolveConflicts(event);

        if (resolvedEvent) {
          await this.redisService.publishSyncEvent(resolvedEvent);
          this.logger.debug(`Leader processed and broadcasted: ${resolvedEvent.operation} ${resolvedEvent.entityType} ${resolvedEvent.entityId}`, DistributedCoordinatorService.name);
        }
      } catch (error) {
        this.logger.error(`Leader failed to process event: ${event.eventId}`, error.stack, DistributedCoordinatorService.name);
      }
    }
  }

  private async resolveConflicts(event: SyncEvent): Promise<SyncEvent | null> {
    try {
      const currentVersion = await this.redisService.getEntityVersion(event.entityType, event.entityId);

      if (event.operation === 'DELETE') {
        const newVersion = await this.redisService.incrementEntityVersion(event.entityType, event.entityId);
        return {
          ...event,
          version: newVersion,
          timestamp: new Date(),
        };
      }

      if (event.version < currentVersion) {
        this.logger.warn(`Version conflict detected for ${event.entityType}:${event.entityId}. Current: ${currentVersion}, Incoming: ${event.version}`, DistributedCoordinatorService.name);

        return null;
      }

      const newVersion = await this.redisService.incrementEntityVersion(event.entityType, event.entityId);
      return {
        ...event,
        version: newVersion,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to resolve conflicts for event: ${event.eventId}`, error.stack, DistributedCoordinatorService.name);
      return null;
    }
  }

  private async applySyncEvent(event: SyncEvent): Promise<void> {
    switch (event.entityType) {
      case 'coaster':
        await this.applySyncEventToCoaster(event);
        break;
      case 'wagon':
        await this.applySyncEventToWagon(event);
        break;
      default:
        this.logger.warn(`Unknown entity type in sync event: ${String(event.entityType)}`, DistributedCoordinatorService.name);
    }
  }

  private async applySyncEventToCoaster(event: SyncEvent): Promise<void> {
    switch (event.operation) {
      case 'CREATE':
      case 'UPDATE': {
        const coasterData = {
          ...event.data,
          nodeId: event.nodeId,
        };
        await this.storageService.saveCoaster(coasterData);
        break;
      }
      case 'DELETE':
        await this.storageService.deleteCoaster(event.entityId);
        break;
    }
  }

  private async applySyncEventToWagon(event: SyncEvent): Promise<void> {
    switch (event.operation) {
      case 'CREATE':
      case 'UPDATE': {
        const wagonData = {
          ...event.data,
          nodeId: event.nodeId,
        };
        await this.storageService.saveWagon(wagonData);
        break;
      }
      case 'DELETE':
        await this.storageService.deleteWagon(event.entityId);
        break;
    }
  }

  public async getClusterInfo(): Promise<{
    nodeId: string;
    isLeader: boolean;
    totalNodes: number;
    activeNodes: number;
  }> {
    const allNodes = await this.redisService.getAllNodes();
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const activeNodes = Object.values(allNodes).filter((node) => {
      const lastHeartbeat = new Date(node.lastHeartbeat);
      return lastHeartbeat > twoMinutesAgo;
    });

    return {
      nodeId: this.nodeId,
      isLeader: this.isLeader,
      totalNodes: Object.keys(allNodes).length,
      activeNodes: activeNodes.length,
    };
  }

  public getNodeStatus(): 'online' | 'offline' | 'syncing' {
    if (!this.isInitialized) return 'offline';
    if (!this.redisService.isRedisConnected()) return 'offline';
    return 'online';
  }

  @Cron(CronExpression.EVERY_HOUR)
  public async scheduledCleanup(): Promise<void> {
    await this.cleanupDeadNodes();
    this.logger.debug('Scheduled cleanup completed', DistributedCoordinatorService.name);
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      const clusterInfo = await this.getClusterInfo();
      const nodeStatus = this.getNodeStatus();

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (nodeStatus === 'offline') {
        status = 'unhealthy';
      } else if (clusterInfo.activeNodes < clusterInfo.totalNodes * 0.8) {
        status = 'degraded';
      }

      return {
        status,
        details: {
          ...clusterInfo,
          nodeStatus,
          redisConnected: this.redisService.isRedisConnected(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          nodeId: this.nodeId,
        },
      };
    }
  }
}
