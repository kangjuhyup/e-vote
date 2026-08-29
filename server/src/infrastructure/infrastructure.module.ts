import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { LoggingModule } from './logging/logging.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    DatabaseModule.register(),
    LoggingModule,
    RedisModule,
    StorageModule,
  ],
  exports: [DatabaseModule, LoggingModule, RedisModule, StorageModule],
})
export class InfrastructureModule {}
