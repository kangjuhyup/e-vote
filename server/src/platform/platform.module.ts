import { type DynamicModule, Module } from '@nestjs/common';
import {
  DatabaseModule,
  type DatabaseModuleOptions,
} from './database/database.module';
import { LoggingModule } from './logging/logging.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { AuthenticationModule } from './authentication/authentication.module';

@Module({})
export class PlatformModule {
  static register(options: DatabaseModuleOptions): DynamicModule {
    return {
      module: PlatformModule,
      imports: [
        AuthenticationModule,
        DatabaseModule.register(options),
        LoggingModule,
        RedisModule,
        StorageModule,
      ],
      exports: [
        AuthenticationModule,
        DatabaseModule,
        LoggingModule,
        RedisModule,
        StorageModule,
      ],
    };
  }
}
