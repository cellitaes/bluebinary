import { Module } from '@nestjs/common';

import { LoggerModule } from '../logger/logger.module';
import { RedisModule } from '../redis/redis.module';
import { StoragesModule } from '../storages/storages.module';

import { DistributedCoordinatorService } from './distributed-coordinator.service';

@Module({
  providers: [DistributedCoordinatorService],
  exports: [DistributedCoordinatorService],
  imports: [LoggerModule, RedisModule, StoragesModule],
})
export class CoordinatorsModule {}
