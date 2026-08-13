import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DATABASE_HEALTH_PORT } from './application/port/database-health.port';
import { CreateVoteHandler } from './application/command/create-vote.handler';
import { GetVotePageHandler } from './application/query/get-vote-page.handler';
import { GetVoteHandler } from './application/query/get-vote.handler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { NotConfiguredDatabaseHealthAdapter } from './infrastructure/database/not-configured-database-health.adapter';
import { RequestIdMiddleware } from './presentation/common/middleware/request-id.middleware';
import { VoteController } from './presentation/route/vote/vote.controller';

@Module({
  imports: [InfrastructureModule],
  controllers: [AppController, VoteController],
  providers: [
    AppService,
    CreateVoteHandler,
    GetVoteHandler,
    GetVotePageHandler,
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
