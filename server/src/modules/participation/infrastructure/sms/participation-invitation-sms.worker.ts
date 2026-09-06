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
import { ProcessParticipationInvitationDeliveryHandler } from '../../application/command/handler/process-participation-invitation-delivery.handler';
import {
  PARTICIPATION_ACCESS_REPOSITORY_PORT,
  type ParticipationAccessRepositoryPort,
} from '../../application/port/persistence/command/participation-access-repository.port';

const POLL_INTERVAL_MS = 500;
const BATCH_SIZE = 20;
const LEASE_DURATION_MS = 30_000;
const MAX_ATTEMPTS = 20;

@Injectable()
export class ParticipationInvitationSmsWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ParticipationInvitationSmsWorker.name);
  private readonly workerId = `participation-invitation-${randomUUID()}`;
  private loopPromise: Promise<ContinuousPollingLoop> | undefined;
  private abortController: AbortController | undefined;
  private running: Promise<void> | undefined;
  private dispatchPromise: Promise<number> | undefined;

  constructor(
    @Inject(PARTICIPATION_ACCESS_REPOSITORY_PORT)
    private readonly repository: ParticipationAccessRepositoryPort,
    private readonly handler: ProcessParticipationInvitationDeliveryHandler,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.abortController) return;
    const abortController = new AbortController();
    this.abortController = abortController;
    const loop = await this.getLoop();
    if (abortController.signal.aborted) return;
    this.running = loop.runUntilStopped({ signal: abortController.signal });
  }

  async onApplicationShutdown(): Promise<void> {
    this.abortController?.abort();
    await this.running;
    this.abortController = undefined;
    this.running = undefined;
  }

  async dispatchOnce(): Promise<number> {
    const loop = await this.getLoop();
    return (await loop.runOnce()).processedCount;
  }

  private getLoop(): Promise<ContinuousPollingLoop> {
    this.loopPromise ??= import('@rvkang/batch-core/polling').then(
      ({ ContinuousPollingLoop: PollingLoop }) =>
        new PollingLoop({
          workerId: this.workerId,
          pollIntervalMs: POLL_INTERVAL_MS,
          task: (context) => this.dispatchBatch(context),
          observer: { onPollingEvent: (event) => this.observe(event) },
        }),
    );
    return this.loopPromise;
  }

  private async dispatchBatch(context: PollingTaskContext): Promise<number> {
    if (this.dispatchPromise) return this.dispatchPromise;
    context.signal.throwIfAborted();
    const current = this.processBatch(context).finally(() => {
      if (this.dispatchPromise === current) this.dispatchPromise = undefined;
    });
    this.dispatchPromise = current;
    return current;
  }

  private async processBatch(context: PollingTaskContext): Promise<number> {
    const deliveries = await this.repository.claimDeliveryBatch({
      workerId: context.workerId,
      batchSize: BATCH_SIZE,
      leaseDurationMs: LEASE_DURATION_MS,
    });
    for (const delivery of deliveries) {
      try {
        await this.handler.execute(delivery);
      } catch (error) {
        const now = new Date();
        const errorMessage =
          error instanceof Error ? error.message : 'invitation delivery failed';
        if (delivery.attemptCount >= MAX_ATTEMPTS) {
          await this.repository.markDeliveryDead({
            id: delivery.id,
            lockToken: delivery.lockToken,
            errorMessage,
            now,
          });
          continue;
        }
        const delayMs = Math.min(
          1_000 * 2 ** (delivery.attemptCount - 1),
          3_600_000,
        );
        await this.repository.rescheduleDelivery({
          id: delivery.id,
          lockToken: delivery.lockToken,
          availableAt: new Date(now.getTime() + delayMs),
          errorMessage,
          now,
        });
      }
    }
    return deliveries.length;
  }

  private observe(event: PollingEvent): void {
    if (event.type !== 'polling.iteration.error_backoff') return;
    this.logger.error(
      `participation invitation worker failed; retrying after ${event.backoffMs}ms`,
    );
  }
}
