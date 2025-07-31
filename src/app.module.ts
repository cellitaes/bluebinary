import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { CalculatorsModule } from './common/services/calculators/calculators.module';
import { CoordinatorsModule } from './common/services/coordinators/coordinators.module';
import { LoggerModule } from './common/services/logger/logger.module';
import { RedisModule } from './common/services/redis/redis.module';
import { StatisticsModule } from './common/services/statistics/statistics.module';
import { StoragesModule } from './common/services/storages/storages.module';
import configuration from './config';
import { CoastersController } from './modules/coasters/coasters.controller';
import { CoastersModule } from './modules/coasters/coasters.module';
import { CoastersService } from './modules/coasters/coasters.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: (config) => configuration(config),
    }),
    ScheduleModule.forRoot(),
    CoastersModule,
    LoggerModule,
    StoragesModule,
    StatisticsModule,
    RedisModule,
    CoordinatorsModule,
    CalculatorsModule,
  ],
  controllers: [CoastersController],
  providers: [CoastersService],
})
export class AppModule {}
