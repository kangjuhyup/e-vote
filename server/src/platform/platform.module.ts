import { type DynamicModule, Module } from '@nestjs/common';
import {
  DatabaseModule,
  type DatabaseModuleOptions,
} from './database/database.module';
import { LoggingModule } from './logging/logging.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';

@Module({})
export class PlatformModule {
  static register(options: DatabaseModuleOptions): DynamicModule {
    return {
      module: PlatformModule,
      imports: [
        DatabaseModule.register(options),
        LoggingModule,
        RedisModule,
        StorageModule,
      ],
      exports: [DatabaseModule, LoggingModule, RedisModule, StorageModule],
    };
  }
}
