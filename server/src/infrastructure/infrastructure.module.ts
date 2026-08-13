import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [DatabaseModule.register(), RedisModule],
  exports: [RedisModule],
})
export class InfrastructureModule {}
