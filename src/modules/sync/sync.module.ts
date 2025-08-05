import { Module } from '@nestjs/common';

import { CoordinatorsModule } from '../../common/services/coordinators/coordinators.module';
import { LoggerModule } from '../../common/services/logger/logger.module';
import { RedisModule } from '../../common/services/redis/redis.module';

import { SyncService } from './sync.service';

@Module({
  imports: [RedisModule, CoordinatorsModule, LoggerModule],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
