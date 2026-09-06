import { MODULE_METADATA } from '@nestjs/common/constants';
import { MockPaymentOutboxWorker } from '../src/modules/billing/infrastructure/payment/mock-payment-outbox.worker';
import {
  MOCK_PAYMENT_RANDOM_SOURCE,
  PAYMENT_INTEGRATION_MODE,
} from '../src/modules/billing/infrastructure/payment/payment-integration.config';
import { INTEGRATION_EVENT_PUBLISHER_PORT } from '../src/shared/application/port/messaging/integration-event-publisher.port';
import { WorkerModule } from '../src/worker.module';

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
        expect.objectContaining({ provide: PAYMENT_INTEGRATION_MODE }),
        expect.objectContaining({ provide: MOCK_PAYMENT_RANDOM_SOURCE }),
        expect.objectContaining({ provide: INTEGRATION_EVENT_PUBLISHER_PORT }),
      ]),
    );
  });
});
