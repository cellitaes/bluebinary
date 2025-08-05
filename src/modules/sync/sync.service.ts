import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';

import { DistributedCoordinatorService } from '../../common/services/coordinators/distributed-coordinator.service';
import { SyncEvent } from '../../common/services/coordinators/distributed-coordinator.type';
import { CustomLoggerService } from '../../common/services/logger/logger.service';
import { RedisService } from '../../common/services/redis/redis.service';

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private syncEventSubject = new Subject<SyncEvent>();
  private syncInterval: NodeJS.Timeout;

  constructor(
    private redisService: RedisService,
    private distributedCoordinator: DistributedCoordinatorService,
    private logger: CustomLoggerService,
  ) {}

  public onModuleInit(): void {
    // Start polling for sync events to broadcast via SSE
    this.syncInterval = setInterval(() => {
      void this.pollSyncEvents();
    }, 2000); // Poll every 2 seconds
  }

  public onModuleDestroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.syncEventSubject.complete();
  }

  public getSyncEventStream(): Observable<MessageEvent> {
    return this.syncEventSubject.asObservable().pipe(
      map(
        (event: SyncEvent) =>
          ({
            data: JSON.stringify({
              type: 'sync_event',
              event,
              timestamp: new Date().toISOString(),
            }),
          }) as MessageEvent,
      ),
    );
  }

  public async getSyncStatus() {
    const clusterInfo = await this.distributedCoordinator.getClusterInfo();
    const nodeStatus = this.distributedCoordinator.getNodeStatus();

    return {
      nodeId: clusterInfo.nodeId,
      isLeader: clusterInfo.isLeader,
      nodeStatus,
      totalNodes: clusterInfo.totalNodes,
      activeNodes: clusterInfo.activeNodes,
      redisConnected: this.redisService.isRedisConnected(),
      timestamp: new Date().toISOString(),
    };
  }

  private async pollSyncEvents(): Promise<void> {
    try {
      const events = await this.redisService.getSyncEvents(5);

      for (const event of events) {
        this.syncEventSubject.next(event);
      }
    } catch (error) {
      this.logger.error('Failed to poll sync events for SSE', error.stack, 'SyncService');
    }
  }

  public emitSyncEvent(event: SyncEvent): void {
    this.syncEventSubject.next(event);
  }
}
