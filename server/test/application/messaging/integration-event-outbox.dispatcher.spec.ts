import { ClaimedOutboxMessage } from '../../../src/shared/application/messaging/claimed-outbox-message';
import { IntegrationEventEnvelope } from '../../../src/shared/application/messaging/integration-event-envelope';
import { IntegrationEventOutboxDispatcher } from '../../../src/shared/application/messaging/integration-event-outbox.dispatcher';
import type { IntegrationEventPublisherPort } from '../../../src/shared/application/port/messaging/integration-event-publisher.port';
import type { OutboxMessageRepositoryPort } from '../../../src/shared/application/port/messaging/outbox-message-repository.port';

describe('integration event outbox dispatcher', () => {
  it('publishes and marks a claimed message as published', async () => {
    const { dispatcher, repository, publisher, message } = fixture();

    const result = await dispatcher.dispatchBatch({
      workerId: 'worker-1',
      batchSize: 10,
      leaseDurationMs: 30_000,
    });

    expect(repository.recordPublishAttempt.mock.calls).toContainEqual([
      lease(message),
    ]);
    expect(publisher.publish.mock.calls).toContainEqual([message.envelope]);
    expect(repository.markPublished.mock.calls).toContainEqual([
      lease(message),
    ]);
    expect(result).toEqual(
      expect.objectContaining({
        claimedCount: 1,
        publishedCount: 1,
        rescheduledCount: 0,
        deadCount: 0,
        lostLeaseCount: 0,
      }),
    );
  });

  it('reschedules transient publication failures with bounded jitter', async () => {
    const { dispatcher, repository, publisher, message } = fixture();
    publisher.publish.mockRejectedValueOnce(new Error('network\nfailed'));

    const result = await dispatcher.dispatchBatch(request());

    const retryParams = repository.reschedule.mock.calls[0]?.[0];
    if (!retryParams) throw new Error('retry parameters were not recorded');
    expect(retryParams.messageId).toBe(message.envelope.id);
    expect(retryParams.lockToken).toBe(message.lockToken);
    expect(retryParams.errorMessage).toBe('network\nfailed');
    const delayMs = retryParams.delayMs;
    expect(delayMs).toBeGreaterThanOrEqual(800);
    expect(delayMs).toBeLessThanOrEqual(1_200);
    expect(result.rescheduledCount).toBe(1);
  });

  it('moves a message to dead after the final publish attempt', async () => {
    const { dispatcher, repository, publisher, message } = fixture(19);
    publisher.publish.mockRejectedValueOnce(new Error('unsupported schema'));

    const result = await dispatcher.dispatchBatch(request());

    expect(repository.markDead.mock.calls).toContainEqual([
      {
        ...lease(message),
        errorMessage: 'unsupported schema',
      },
    ]);
    expect(repository.reschedule.mock.calls).toHaveLength(0);
    expect(result.deadCount).toBe(1);
  });

  it('does not publish after losing ownership of the lease', async () => {
    const { dispatcher, repository, publisher } = fixture();
    repository.recordPublishAttempt.mockResolvedValueOnce(false);

    const result = await dispatcher.dispatchBatch(request());

    expect(publisher.publish.mock.calls).toHaveLength(0);
    expect(repository.markPublished.mock.calls).toHaveLength(0);
    expect(result.lostLeaseCount).toBe(1);
  });

  function fixture(publishAttemptCount = 0) {
    const message = ClaimedOutboxMessage.of({
      envelope: IntegrationEventEnvelope.of({
        id: '00000000-0000-4000-8000-000000000010',
        deduplicationKey:
          'vote-service:BillingOrder:00000000-0000-4000-8000-000000000001:1:BillingOrderIssued:0',
        source: 'vote-service',
        eventType: 'billing.order-issued.v1',
        schemaVersion: 1,
        aggregateType: 'BillingOrder',
        aggregateId: '00000000-0000-4000-8000-000000000001',
        aggregateVersion: 1,
        eventPosition: 0,
        payload: {
          billingOrderId: '00000000-0000-4000-8000-000000000001',
        },
        occurredAt: new Date('2026-09-02T12:00:00.000Z'),
      }),
      lockToken: '00000000-0000-4000-8000-000000000099',
      publishAttemptCount,
    });
    const repository: jest.Mocked<OutboxMessageRepositoryPort> = {
      claimBatch: jest.fn().mockResolvedValue([message]),
      recordPublishAttempt: jest.fn().mockResolvedValue(true),
      markPublished: jest.fn().mockResolvedValue(true),
      reschedule: jest.fn().mockResolvedValue(true),
      markDead: jest.fn().mockResolvedValue(true),
    };
    const publisher: jest.Mocked<IntegrationEventPublisherPort> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    const dispatcher = new IntegrationEventOutboxDispatcher(
      repository,
      publisher,
    );
    return { dispatcher, repository, publisher, message };
  }

  function request() {
    return {
      workerId: 'worker-1',
      batchSize: 10,
      leaseDurationMs: 30_000,
    };
  }

  function lease(message: ClaimedOutboxMessage) {
    return {
      messageId: message.envelope.id,
      lockToken: message.lockToken,
    };
  }
});
