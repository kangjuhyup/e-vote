import { type IntegrationEventPublisherPort } from '../port/messaging/integration-event-publisher.port';
import { type OutboxMessageRepositoryPort } from '../port/messaging/outbox-message-repository.port';
import {
  DispatchIntegrationOutboxRequest,
  DispatchIntegrationOutboxResult,
} from './dto/dispatch-integration-outbox.dto';

const MAX_PUBLISH_ATTEMPTS = 20;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1_000;

export class IntegrationEventOutboxDispatcher {
  constructor(
    private readonly repository: OutboxMessageRepositoryPort,
    private readonly publisher: IntegrationEventPublisherPort,
  ) {}

  async dispatchBatch(
    request: DispatchIntegrationOutboxRequest,
  ): Promise<DispatchIntegrationOutboxResult> {
    const messages = await this.repository.claimBatch(request);
    let publishedCount = 0;
    let rescheduledCount = 0;
    let deadCount = 0;
    let lostLeaseCount = 0;

    for (const message of messages) {
      const lease = {
        messageId: message.envelope.id,
        lockToken: message.lockToken,
      };
      const ownsLease = await this.repository.recordPublishAttempt(lease);
      if (!ownsLease) {
        lostLeaseCount += 1;
        continue;
      }

      try {
        await this.publisher.publish(message.envelope);
        if (await this.repository.markPublished(lease)) {
          publishedCount += 1;
        } else {
          lostLeaseCount += 1;
        }
      } catch (error) {
        const errorMessage = this.errorMessage(error);
        const attemptNumber = message.publishAttemptCount + 1;
        if (attemptNumber >= MAX_PUBLISH_ATTEMPTS) {
          if (await this.repository.markDead({ ...lease, errorMessage })) {
            deadCount += 1;
          } else {
            lostLeaseCount += 1;
          }
          continue;
        }

        const delayMs = calculateOutboxRetryDelayMs(
          attemptNumber,
          message.envelope.id,
        );
        if (
          await this.repository.reschedule({ ...lease, delayMs, errorMessage })
        ) {
          rescheduledCount += 1;
        } else {
          lostLeaseCount += 1;
        }
      }
    }

    return DispatchIntegrationOutboxResult.of({
      claimedCount: messages.length,
      publishedCount,
      rescheduledCount,
      deadCount,
      lostLeaseCount,
    });
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown publish failure';
  }
}

export function calculateOutboxRetryDelayMs(
  attemptNumber: number,
  messageId: string,
): number {
  const exponent = Math.max(0, Math.min(attemptNumber - 1, 12));
  const baseDelayMs = Math.min(1_000 * 2 ** exponent, MAX_RETRY_DELAY_MS);
  const hash = [...messageId].reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  const jitterFactor = 0.8 + (hash % 401) / 1_000;
  return Math.min(Math.round(baseDelayMs * jitterFactor), MAX_RETRY_DELAY_MS);
}
