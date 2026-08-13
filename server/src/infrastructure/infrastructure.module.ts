import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [DatabaseModule.register(), RedisModule, StorageModule],
  exports: [DatabaseModule, RedisModule, StorageModule],
})
export class InfrastructureModule {}
