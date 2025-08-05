import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

import { Config } from '../../../config';
import { NodeInfo, SyncEvent } from '../coordinators/distributed-coordinator.type';
import { CustomLoggerService } from '../logger/logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private isConnected = false;

  constructor(
    private configService: ConfigService<Config>,
    private logger: CustomLoggerService,
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const redisHost = this.configService.getOrThrow('REDIS_HOST');
      const redisPort = this.configService.getOrThrow('REDIS_PORT');
      const redisPassword = this.configService.get('REDIS_PASSWORD');

      this.client = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
        },
        password: redisPassword,
      });

      this.client.on('error', (err) => {
        this.logger.error('Redis Client Error', err.stack, 'RedisService');
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.logger.log('Redis Client Connected', 'RedisService');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        this.logger.warn('Redis Client Disconnected', 'RedisService');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error.stack, 'RedisService');
      this.isConnected = false;
    }
  }

  private async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  public isRedisConnected(): boolean {
    return this.isConnected;
  }

  public async registerNode(nodeId: string, nodeInfo: any): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.client.hSet(
        'nodes',
        nodeId,
        JSON.stringify({
          ...nodeInfo,
          lastHeartbeat: new Date(),
        }),
      );
      this.logger.logDistributedEvent('NODE_REGISTERED', nodeId, nodeInfo);
    } catch (error) {
      this.logger.error('Failed to register node', error.stack, 'RedisService');
    }
  }

  public async updateHeartbeat(nodeId: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const nodeInfo = await this.getNodeInfo(nodeId);
      if (nodeInfo) {
        nodeInfo.lastHeartbeat = new Date();
        await this.client.hSet('nodes', nodeId, JSON.stringify(nodeInfo));
      }
    } catch (error) {
      this.logger.error('Failed to update heartbeat', error.stack, 'RedisService');
    }
  }

  public async getNodeInfo(nodeId: string): Promise<NodeInfo | null> {
    if (!this.isConnected) return null;

    try {
      const nodeData = await this.client.hGet('nodes', nodeId);
      return nodeData ? (JSON.parse(nodeData) as NodeInfo) : null;
    } catch (error) {
      this.logger.error('Failed to get node info', error.stack, 'RedisService');
      return null;
    }
  }

  public async getAllNodes(): Promise<Record<string, any>> {
    if (!this.isConnected) return {};

    try {
      const nodes = await this.client.hGetAll('nodes');
      const parsedNodes: Record<string, any> = {};

      for (const [nodeId, nodeData] of Object.entries(nodes)) {
        parsedNodes[nodeId] = JSON.parse(nodeData);
      }

      return parsedNodes;
    } catch (error) {
      this.logger.error('Failed to get all nodes', error.stack, 'RedisService');
      return {};
    }
  }

  public async removeNode(nodeId: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.client.hDel('nodes', nodeId);
      this.logger.logDistributedEvent('NODE_REMOVED', nodeId);
    } catch (error) {
      this.logger.error('Failed to remove node', error.stack, 'RedisService');
    }
  }

  public async tryBecomeLeader(nodeId: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const result = await this.client.set('leader', nodeId, {
        NX: true,
        EX: 60,
      });

      if (result === 'OK') {
        this.logger.logDistributedEvent('LEADER_ELECTED', nodeId);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Failed to become leader', error.stack, 'RedisService');
      return false;
    }
  }

  public async renewLeadership(nodeId: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const currentLeader = await this.client.get('leader');
      if (currentLeader === nodeId) {
        await this.client.expire('leader', 60);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Failed to renew leadership', error.stack, 'RedisService');
      return false;
    }
  }

  public async getCurrentLeader(): Promise<string | null> {
    if (!this.isConnected) return null;

    try {
      return await this.client.get('leader');
    } catch (error) {
      this.logger.error('Failed to get current leader', error.stack, 'RedisService');
      return null;
    }
  }

  public async publishSyncEvent(event: any): Promise<void> {
    if (!this.isConnected) return;

    try {
      // Store event with unique key for processing tracking
      const eventKey = `sync_event:${event.eventId}`;
      await this.client.setEx(eventKey, 3600, JSON.stringify(event)); // Expire after 1 hour

      await this.client.lPush('sync_events', JSON.stringify(event));
      await this.client.lTrim('sync_events', 0, 999);
      this.logger.logDistributedEvent('SYNC_EVENT_PUBLISHED', event.nodeId, event);
    } catch (error) {
      this.logger.error('Failed to publish sync event', error.stack, 'RedisService');
    }
  }

  public async getSyncEvents(count = 10): Promise<SyncEvent[]> {
    if (!this.isConnected) return [];

    try {
      const events = await this.client.lRange('sync_events', 0, count - 1);
      return events.map((event) => JSON.parse(event) as SyncEvent);
    } catch (error) {
      this.logger.error('Failed to get sync events', error.stack, 'RedisService');
      return [];
    }
  }

  public async markEventProcessed(eventId: string, nodeId: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const eventKey = `sync_event:${eventId}`;
      const eventData = await this.client.get(eventKey);

      if (eventData) {
        const event = JSON.parse(eventData) as SyncEvent;
        if (!event.processedBy) {
          event.processedBy = [];
        }

        if (!event.processedBy.includes(nodeId)) {
          event.processedBy.push(nodeId);
          await this.client.setEx(eventKey, 3600, JSON.stringify(event));
        }
      }
    } catch (error) {
      this.logger.error('Failed to mark event as processed', error.stack, 'RedisService');
    }
  }

  public async getEntityVersion(entityType: string, entityId: string): Promise<number> {
    if (!this.isConnected) return 1;

    try {
      const versionKey = `version:${entityType}:${entityId}`;
      const version = await this.client.get(versionKey);
      return version ? parseInt(version, 10) : 1;
    } catch (error) {
      this.logger.error('Failed to get entity version', error.stack, 'RedisService');
      return 1;
    }
  }

  public async incrementEntityVersion(entityType: string, entityId: string): Promise<number> {
    if (!this.isConnected) return 1;

    try {
      const versionKey = `version:${entityType}:${entityId}`;
      const newVersion = await this.client.incr(versionKey);
      await this.client.expire(versionKey, 86400); // Expire after 24 hours
      return newVersion;
    } catch (error) {
      this.logger.error('Failed to increment entity version', error.stack, 'RedisService');
      return 1;
    }
  }

  public async submitChangeToLeader(event: SyncEvent): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const leader = await this.getCurrentLeader();
      if (!leader) {
        await this.publishSyncEvent(event);
        return true;
      }

      await this.client.lPush(`leader_queue:${leader}`, JSON.stringify(event));
      await this.client.lTrim(`leader_queue:${leader}`, 0, 999);

      this.logger.logDistributedEvent('CHANGE_SUBMITTED_TO_LEADER', event.nodeId, { leader, eventId: event.eventId });
      return true;
    } catch (error) {
      this.logger.error('Failed to submit change to leader', error.stack, 'RedisService');
      return false;
    }
  }

  public async getLeaderQueue(leaderId: string, count = 10): Promise<SyncEvent[]> {
    if (!this.isConnected) return [];

    try {
      const events = await this.client.lRange(`leader_queue:${leaderId}`, 0, count - 1);
      if (events.length > 0) {
        await this.client.lTrim(`leader_queue:${leaderId}`, events.length, -1);
      }
      return events.map((event) => JSON.parse(event) as SyncEvent);
    } catch (error) {
      this.logger.error('Failed to get leader queue', error.stack, 'RedisService');
      return [];
    }
  }
}
