import { Module } from '@nestjs/common';

import { CalculatorsModule } from '../../common/services/calculators/calculators.module';
import { LoggerModule } from '../../common/services/logger/logger.module';
import { RedisModule } from '../../common/services/redis/redis.module';
import { StoragesModule } from '../../common/services/storages/storages.module';

import { CoastersController } from './coasters.controller';
import { CoastersService } from './coasters.service';

@Module({
  imports: [StoragesModule, LoggerModule, RedisModule, CalculatorsModule],
  controllers: [CoastersController],
  providers: [CoastersService],
  exports: [CoastersService],
})
export class CoastersModule {}
