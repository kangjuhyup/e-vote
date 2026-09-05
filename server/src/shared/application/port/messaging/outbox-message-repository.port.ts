import type { ClaimedOutboxMessage } from '../../messaging/claimed-outbox-message';

export const OUTBOX_MESSAGE_REPOSITORY_PORT = Symbol(
  'OUTBOX_MESSAGE_REPOSITORY_PORT',
);

export interface ClaimOutboxMessagesParams {
  readonly workerId: string;
  readonly batchSize: number;
  readonly leaseDurationMs: number;
}

export interface OutboxMessageLeaseParams {
  readonly messageId: string;
  readonly lockToken: string;
}

export interface RescheduleOutboxMessageParams extends OutboxMessageLeaseParams {
  readonly delayMs: number;
  readonly errorMessage: string;
}

export interface MarkOutboxMessageDeadParams extends OutboxMessageLeaseParams {
  readonly errorMessage: string;
}

export interface OutboxMessageRepositoryPort {
  claimBatch(
    params: ClaimOutboxMessagesParams,
  ): Promise<readonly ClaimedOutboxMessage[]>;
  recordPublishAttempt(params: OutboxMessageLeaseParams): Promise<boolean>;
  markPublished(params: OutboxMessageLeaseParams): Promise<boolean>;
  reschedule(params: RescheduleOutboxMessageParams): Promise<boolean>;
  markDead(params: MarkOutboxMessageDeadParams): Promise<boolean>;
}
