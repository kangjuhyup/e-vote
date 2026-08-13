import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DATABASE_HEALTH_PORT } from './application/port/database-health.port';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { NotConfiguredDatabaseHealthAdapter } from './infrastructure/database/not-configured-database-health.adapter';
import { RequestIdMiddleware } from './presentation/common/middleware/request-id.middleware';

@Module({
  imports: [InfrastructureModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: DATABASE_HEALTH_PORT,
      useClass: NotConfiguredDatabaseHealthAdapter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
