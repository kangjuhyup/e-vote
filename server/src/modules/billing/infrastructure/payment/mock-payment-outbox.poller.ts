import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { DispatchIntegrationOutboxRequest } from '../../../../shared/application/messaging/dto/dispatch-integration-outbox.dto';
import { IntegrationEventOutboxDispatcher } from '../../../../shared/application/messaging/integration-event-outbox.dispatcher';
import {
  PAYMENT_INTEGRATION_MODE,
  type PaymentIntegrationMode,
} from './payment-integration.config';

const POLL_INTERVAL_MS = 500;
const BATCH_SIZE = 20;
const LEASE_DURATION_MS = 30_000;

@Injectable()
export class MockPaymentOutboxPoller
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MockPaymentOutboxPoller.name);
  private readonly workerId = `mock-payment-${randomUUID()}`;
  private timer: NodeJS.Timeout | undefined;
  private dispatchPromise: Promise<void> | undefined;

  constructor(
    private readonly dispatcher: IntegrationEventOutboxDispatcher,
    @Inject(PAYMENT_INTEGRATION_MODE)
    private readonly mode: PaymentIntegrationMode,
  ) {}

  onApplicationBootstrap(): void {
    if (this.mode !== 'mock') return;

    this.timer = setInterval(() => {
      void this.dispatchOnce();
    }, POLL_INTERVAL_MS);
    this.timer.unref();
    void this.dispatchOnce();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.dispatchPromise;
  }

  dispatchOnce(): Promise<void> {
    if (this.dispatchPromise) return this.dispatchPromise;

    const current = this.dispatcher
      .dispatchBatch(
        DispatchIntegrationOutboxRequest.of({
          workerId: this.workerId,
          batchSize: BATCH_SIZE,
          leaseDurationMs: LEASE_DURATION_MS,
        }),
      )
      .then(() => undefined)
      .catch(() => {
        this.logger.error('mock payment outbox dispatch failed');
      })
      .finally(() => {
        if (this.dispatchPromise === current) {
          this.dispatchPromise = undefined;
        }
      });
    this.dispatchPromise = current;
    return current;
  }
}
