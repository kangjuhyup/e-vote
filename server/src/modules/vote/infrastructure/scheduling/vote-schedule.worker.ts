import { randomUUID } from 'node:crypto';
import type {
  ContinuousPollingLoop,
  PollingEvent,
  PollingTaskContext,
} from '@rvkang/batch-core/polling';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ProcessDueVoteSchedulesCommand } from '../../application/command/dto/request/process-due-vote-schedules.command';
import { ProcessDueVoteSchedulesHandler } from '../../application/command/handler/process-due-vote-schedules.handler';

const POLL_INTERVAL_MS = 500;
const BATCH_SIZE = 20;

@Injectable()
export class VoteScheduleWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(VoteScheduleWorker.name);
  private readonly workerId = `vote-schedule-${randomUUID()}`;
  private loopPromise: Promise<ContinuousPollingLoop> | undefined;
  private abortController: AbortController | undefined;
  private running: Promise<void> | undefined;
  private processing: Promise<number> | undefined;

  constructor(private readonly handler: ProcessDueVoteSchedulesHandler) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.abortController) return;

    const abortController = new AbortController();
    this.abortController = abortController;
    const loop = await this.getLoop();
    if (
      abortController.signal.aborted ||
      this.abortController !== abortController
    ) {
      return;
    }
    this.running = loop.runUntilStopped({ signal: abortController.signal });
  }

  async onApplicationShutdown(): Promise<void> {
    this.abortController?.abort();
    await this.running;
    this.abortController = undefined;
    this.running = undefined;
  }

  async dispatchOnce(now = new Date()): Promise<number> {
    if (this.processing) return this.processing;

    const current = this.handler
      .execute(
        ProcessDueVoteSchedulesCommand.of({ now, batchSize: BATCH_SIZE }),
      )
      .then((result) => result.processedCount)
      .finally(() => {
        if (this.processing === current) this.processing = undefined;
      });
    this.processing = current;
    return current;
  }

  private getLoop(): Promise<ContinuousPollingLoop> {
    this.loopPromise ??= import('@rvkang/batch-core/polling').then(
      ({ ContinuousPollingLoop: PollingLoop }) =>
        new PollingLoop({
          workerId: this.workerId,
          pollIntervalMs: POLL_INTERVAL_MS,
          task: (context) => this.processBatch(context),
          observer: {
            onPollingEvent: (event) => this.observe(event),
          },
        }),
    );
    return this.loopPromise;
  }

  private async processBatch(context: PollingTaskContext): Promise<number> {
    context.signal.throwIfAborted();
    return this.dispatchOnce();
  }

  private observe(event: PollingEvent): void {
    if (event.type !== 'polling.iteration.error_backoff') return;
    this.logger.error(
      `vote schedule worker failed; retrying after ${event.backoffMs}ms`,
      event.error instanceof Error ? event.error.stack : String(event.error),
    );
  }
}
