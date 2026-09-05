import { MODULE_METADATA } from '@nestjs/common/constants';
import { GetVoteResultHandler } from '../src/modules/participation/application/query/handler/get-vote-result.handler';
import { GetVoteTurnoutHandler } from '../src/modules/participation/application/query/handler/get-vote-turnout.handler';
import { AppModule } from '../src/app.module';
import { VoteStatisticsController } from '../src/modules/participation/presentation/vote-statistics/vote-statistics.controller';
import { VoteSmsController } from '../src/modules/vote/presentation/vote-sms/vote-sms.controller';
import { FieldVotingSessionSmsController } from '../src/modules/field-voting/presentation/field-voting-session-sms/field-voting-session-sms.controller';
import { SendVoteSmsHandler } from '../src/modules/vote/application/command/handler/send-vote-sms.handler';
import { SendFieldVotingSessionSmsHandler } from '../src/modules/field-voting/application/command/handler/send-field-voting-session-sms.handler';
import { SMS_SENDER_PORT } from '../src/shared/application/port/gateway/sms-sender.port';
import { RandomSmsSenderAdapter } from '../src/shared/infrastructure/sms/random-sms-sender.adapter';
import { SMS_RECIPIENT_ACCESS_PORT } from '../src/shared/application/port/capability/sms-recipient-access.port';
import { ElectorSmsRecipientAccessAdapter } from '../src/modules/elector/infrastructure/sms/elector-sms-recipient-access.adapter';
import { BillingOrderCancellationController } from '../src/modules/billing/presentation/billing-order/billing-order-cancellation.controller';
import { CancelVoteUsageBillingOrderHandler } from '../src/modules/billing/application/command/handler/cancel-vote-usage-billing-order.handler';
import { DATABASE_HEALTH_PORT } from '../src/shared/application/port/health/database-health.port';
import { MarkBillingOrderRefundedHandler } from '../src/modules/billing/application/command/handler/mark-billing-order-refunded.handler';
import { MockPaymentOutboxPoller } from '../src/modules/billing/infrastructure/payment/mock-payment-outbox.poller';
import { PAYMENT_INTEGRATION_MODE } from '../src/modules/billing/infrastructure/payment/payment-integration.config';
import { INTEGRATION_EVENT_PUBLISHER_PORT } from '../src/shared/application/port/messaging/integration-event-publisher.port';

describe('AppModule', () => {
  it('registers vote statistics query endpoints and handlers', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      AppModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AppModule,
    ) as unknown[];

    expect(controllers).toContain(VoteStatisticsController);
    expect(providers).toContain(GetVoteTurnoutHandler);
    expect(providers).toContain(GetVoteResultHandler);
  });

  it('registers SMS endpoints, handlers, and the random development adapter', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      AppModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AppModule,
    ) as unknown[];

    expect(controllers).toEqual(
      expect.arrayContaining([
        VoteSmsController,
        FieldVotingSessionSmsController,
      ]),
    );
    expect(providers).toEqual(
      expect.arrayContaining([
        SendVoteSmsHandler,
        SendFieldVotingSessionSmsHandler,
      ]),
    );
    expect(providers).toContainEqual({
      provide: SMS_SENDER_PORT,
      useClass: RandomSmsSenderAdapter,
    });
    expect(providers).toContainEqual({
      provide: SMS_RECIPIENT_ACCESS_PORT,
      useClass: ElectorSmsRecipientAccessAdapter,
    });
  });

  it('registers the billing cancellation endpoint and handler', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      AppModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AppModule,
    ) as unknown[];

    expect(controllers).toContain(BillingOrderCancellationController);
    expect(providers).toContain(CancelVoteUsageBillingOrderHandler);
  });

  it('registers development mock payment dispatch behind the payment mode', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AppModule,
    ) as unknown[];

    expect(providers).toEqual(
      expect.arrayContaining([
        MarkBillingOrderRefundedHandler,
        MockPaymentOutboxPoller,
        expect.objectContaining({ provide: PAYMENT_INTEGRATION_MODE }),
        expect.objectContaining({ provide: INTEGRATION_EVENT_PUBLISHER_PORT }),
      ]),
    );
  });

  it('does not override the database health port owned by DatabaseModule', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AppModule,
    ) as unknown[];

    expect(providers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provide: DATABASE_HEALTH_PORT }),
      ]),
    );
  });
});
