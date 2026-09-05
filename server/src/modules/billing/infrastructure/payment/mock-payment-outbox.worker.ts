import { randomUUID } from 'node:crypto';
import type {
  ContinuousPollingLoop,
  PollingEvent,
  PollingTaskContext,
} from '@rvkang/batch-core/polling';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import {
  DispatchIntegrationOutboxRequest,
  type DispatchIntegrationOutboxResult,
} from '../../../../shared/application/messaging/dto/dispatch-integration-outbox.dto';
import { IntegrationEventOutboxDispatcher } from '../../../../shared/application/messaging/integration-event-outbox.dispatcher';
import {
  PAYMENT_INTEGRATION_MODE,
  type PaymentIntegrationMode,
} from './payment-integration.config';

const POLL_INTERVAL_MS = 500;
const BATCH_SIZE = 20;
const LEASE_DURATION_MS = 30_000;

@Injectable()
export class MockPaymentOutboxWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MockPaymentOutboxWorker.name);
  private readonly workerId = `mock-payment-${randomUUID()}`;
  private loopPromise: Promise<ContinuousPollingLoop> | undefined;
  private abortController: AbortController | undefined;
  private running: Promise<void> | undefined;
  private dispatchPromise: Promise<DispatchIntegrationOutboxResult> | undefined;

  constructor(
    private readonly dispatcher: IntegrationEventOutboxDispatcher,
    @Inject(PAYMENT_INTEGRATION_MODE)
    private readonly mode: PaymentIntegrationMode,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.mode !== 'mock' || this.abortController) return;

    const abortController = new AbortController();
    this.abortController = abortController;
    const loop = await this.getLoop();
    if (
      abortController.signal.aborted ||
      this.abortController !== abortController
    ) {
      return;
    }
    this.running = loop.runUntilStopped({
      signal: abortController.signal,
    });
  }

  async onApplicationShutdown(): Promise<void> {
    this.abortController?.abort();
    await this.running;
    this.abortController = undefined;
    this.running = undefined;
  }

  async dispatchOnce(): Promise<void> {
    const loop = await this.getLoop();
    await loop.runOnce();
  }

  private getLoop(): Promise<ContinuousPollingLoop> {
    this.loopPromise ??= import('@rvkang/batch-core/polling').then(
      ({ ContinuousPollingLoop: PollingLoop }) =>
        new PollingLoop({
          workerId: this.workerId,
          pollIntervalMs: POLL_INTERVAL_MS,
          task: (context) => this.dispatchBatch(context),
          observer: {
            onPollingEvent: (event) => this.observe(event),
          },
        }),
    );
    return this.loopPromise;
  }

  private async dispatchBatch(context: PollingTaskContext): Promise<number> {
    if (this.dispatchPromise) {
      return (await this.dispatchPromise).claimedCount;
    }

    context.signal.throwIfAborted();
    const current = this.dispatcher
      .dispatchBatch(
        DispatchIntegrationOutboxRequest.of({
          workerId: context.workerId,
          batchSize: BATCH_SIZE,
          leaseDurationMs: LEASE_DURATION_MS,
        }),
      )
      .finally(() => {
        if (this.dispatchPromise === current) {
          this.dispatchPromise = undefined;
        }
      });
    this.dispatchPromise = current;
    return (await current).claimedCount;
  }

  private observe(event: PollingEvent): void {
    if (event.type !== 'polling.iteration.error_backoff') return;

    this.logger.error(
      `mock payment outbox worker failed; retrying after ${event.backoffMs}ms`,
    );
  }
}
