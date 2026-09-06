import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  databaseRepositoryPortTokens,
  databaseRepositoryProviders,
} from './composition/database-repository.providers';
import { createDatabaseEntityRegistry } from './composition/database-entity.registry';
import { BillingOrderOutboxRecorder } from './modules/billing/application/event/billing-order-outbox.recorder';
import { MarkBillingOrderPaidHandler } from './modules/billing/application/command/handler/mark-billing-order-paid.handler';
import { MarkBillingOrderRefundedHandler } from './modules/billing/application/command/handler/mark-billing-order-refunded.handler';
import { MockPaymentIntegrationEventPublisherAdapter } from './modules/billing/infrastructure/payment/mock-payment-integration-event-publisher.adapter';
import { MockPaymentOutboxWorker } from './modules/billing/infrastructure/payment/mock-payment-outbox.worker';
import {
  MOCK_PAYMENT_RANDOM_SOURCE,
  PAYMENT_INTEGRATION_MODE,
  type MockPaymentRandomSource,
  type PaymentIntegrationMode,
  resolvePaymentIntegrationMode,
} from './modules/billing/infrastructure/payment/payment-integration.config';
import { DatabaseModule } from './platform/database/database.module';
import { NotConfiguredIntegrationEventPublisherAdapter } from './platform/outbox/infrastructure/messaging/not-configured-integration-event-publisher.adapter';
import { IntegrationEventOutboxDispatcher } from './shared/application/messaging/integration-event-outbox.dispatcher';
import { VOTE_SETUP_LIFECYCLE_PORT } from './shared/application/port/capability/vote-billing.port';
import { VOTE_REPOSITORY_PORT } from './modules/vote/application/port/persistence/command/vote-repository.port';
import { VOTE_SCHEDULE_REPOSITORY_PORT } from './modules/vote/application/port/persistence/command/vote-schedule-repository.port';
import { ProcessDueVoteSchedulesHandler } from './modules/vote/application/command/handler/process-due-vote-schedules.handler';
import { VoteScheduleWorker } from './modules/vote/infrastructure/scheduling/vote-schedule.worker';
import { VOTE_USAGE_ENTITLEMENT_ACCESS_PORT } from './shared/application/port/capability/vote-billing.port';
import { BILLING_ORDER_REPOSITORY_PORT } from './modules/billing/application/port/persistence/command/billing-order-repository.port';
import {
  INTEGRATION_EVENT_PUBLISHER_PORT,
  type IntegrationEventPublisherPort,
} from './shared/application/port/messaging/integration-event-publisher.port';
import {
  OUTBOX_MESSAGE_REPOSITORY_PORT,
  type OutboxMessageRepositoryPort,
} from './shared/application/port/messaging/outbox-message-repository.port';

@Module({
  imports: [
    DatabaseModule.register({
      entityRegistryFactory: createDatabaseEntityRegistry,
      repositoryProviders: databaseRepositoryProviders,
      repositoryPortTokens: databaseRepositoryPortTokens,
    }),
  ],
  providers: [
    {
      provide: VOTE_SETUP_LIFECYCLE_PORT,
      useExisting: VOTE_REPOSITORY_PORT,
    },
    {
      provide: VOTE_SCHEDULE_REPOSITORY_PORT,
      useExisting: VOTE_REPOSITORY_PORT,
    },
    {
      provide: VOTE_USAGE_ENTITLEMENT_ACCESS_PORT,
      useExisting: BILLING_ORDER_REPOSITORY_PORT,
    },
    BillingOrderOutboxRecorder,
    MarkBillingOrderPaidHandler,
    MarkBillingOrderRefundedHandler,
    {
      provide: PAYMENT_INTEGRATION_MODE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): PaymentIntegrationMode =>
        resolvePaymentIntegrationMode({
          NODE_ENV: configService.get<string>('NODE_ENV'),
          BILLING_PAYMENT_MODE: configService.get<string>(
            'BILLING_PAYMENT_MODE',
          ),
        }),
    },
    {
      provide: MOCK_PAYMENT_RANDOM_SOURCE,
      useValue: Math.random,
    },
    {
      provide: INTEGRATION_EVENT_PUBLISHER_PORT,
      inject: [
        PAYMENT_INTEGRATION_MODE,
        MarkBillingOrderPaidHandler,
        MarkBillingOrderRefundedHandler,
        MOCK_PAYMENT_RANDOM_SOURCE,
      ],
      useFactory: (
        mode: PaymentIntegrationMode,
        markPaidHandler: MarkBillingOrderPaidHandler,
        markRefundedHandler: MarkBillingOrderRefundedHandler,
        random: MockPaymentRandomSource,
      ): IntegrationEventPublisherPort =>
        mode === 'mock'
          ? new MockPaymentIntegrationEventPublisherAdapter(
              markPaidHandler,
              markRefundedHandler,
              random,
            )
          : new NotConfiguredIntegrationEventPublisherAdapter(),
    },
    {
      provide: IntegrationEventOutboxDispatcher,
      inject: [
        OUTBOX_MESSAGE_REPOSITORY_PORT,
        INTEGRATION_EVENT_PUBLISHER_PORT,
      ],
      useFactory: (
        repository: OutboxMessageRepositoryPort,
        publisher: IntegrationEventPublisherPort,
      ) => new IntegrationEventOutboxDispatcher(repository, publisher),
    },
    MockPaymentOutboxWorker,
    ProcessDueVoteSchedulesHandler,
    VoteScheduleWorker,
  ],
})
export class WorkerModule {}
