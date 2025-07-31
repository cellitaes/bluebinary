import { Module } from '@nestjs/common';

import { LoggerModule } from '../logger/logger.module';

import { RedisService } from './redis.service';

@Module({
  providers: [RedisService],
  exports: [RedisService],
  imports: [LoggerModule],
})
export class RedisModule {}
