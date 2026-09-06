import { MODULE_METADATA } from '@nestjs/common/constants';
import { MockPaymentOutboxWorker } from '../src/modules/billing/infrastructure/payment/mock-payment-outbox.worker';
import {
  MOCK_PAYMENT_RANDOM_SOURCE,
  PAYMENT_INTEGRATION_MODE,
} from '../src/modules/billing/infrastructure/payment/payment-integration.config';
import { INTEGRATION_EVENT_PUBLISHER_PORT } from '../src/shared/application/port/messaging/integration-event-publisher.port';
import { WorkerModule } from '../src/worker.module';
import { VoteScheduleWorker } from '../src/modules/vote/infrastructure/scheduling/vote-schedule.worker';
import { ProcessDueVoteSchedulesHandler } from '../src/modules/vote/application/command/handler/process-due-vote-schedules.handler';
import { VOTE_SCHEDULE_REPOSITORY_PORT } from '../src/modules/vote/application/port/persistence/command/vote-schedule-repository.port';
import { ParticipationInvitationSmsWorker } from '../src/modules/participation/infrastructure/sms/participation-invitation-sms.worker';
import { ProcessParticipationInvitationDeliveryHandler } from '../src/modules/participation/application/command/handler/process-participation-invitation-delivery.handler';

describe('WorkerModule', () => {
  it('registers payment outbox polling only in the controller-free worker root', () => {
    const controllers =
      (Reflect.getMetadata(
        MODULE_METADATA.CONTROLLERS,
        WorkerModule,
      ) as unknown[]) ?? [];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      WorkerModule,
    ) as unknown[];

    expect(controllers).toHaveLength(0);
    expect(providers).toEqual(
      expect.arrayContaining([
        MockPaymentOutboxWorker,
        VoteScheduleWorker,
        ProcessDueVoteSchedulesHandler,
        ParticipationInvitationSmsWorker,
        ProcessParticipationInvitationDeliveryHandler,
        expect.objectContaining({ provide: VOTE_SCHEDULE_REPOSITORY_PORT }),
        expect.objectContaining({ provide: PAYMENT_INTEGRATION_MODE }),
        expect.objectContaining({ provide: MOCK_PAYMENT_RANDOM_SOURCE }),
        expect.objectContaining({ provide: INTEGRATION_EVENT_PUBLISHER_PORT }),
      ]),
    );
  });
});
