import { Module } from '@nestjs/common';

import { LoggerModule } from '../logger/logger.module';

import { JsonStorageService } from './json-storage.service';

@Module({ providers: [JsonStorageService], exports: [JsonStorageService], imports: [LoggerModule] })
export class StoragesModule {}
