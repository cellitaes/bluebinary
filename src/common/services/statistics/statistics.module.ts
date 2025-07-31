import { Module } from '@nestjs/common';

import { CoastersModule } from '../../../modules/coasters/coasters.module';
import { LoggerModule } from '../logger/logger.module';
import { RedisModule } from '../redis/redis.module';
import { StoragesModule } from '../storages/storages.module';

import { StatisticsService } from './statistics.service';

@Module({
  providers: [StatisticsService],
  exports: [StatisticsService],
  imports: [LoggerModule, RedisModule, StoragesModule, CoastersModule],
})
export class StatisticsModule {}
