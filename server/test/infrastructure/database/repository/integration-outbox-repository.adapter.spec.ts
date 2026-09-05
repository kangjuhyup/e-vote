import { IntegrationOutboxRepositoryAdapter } from '../../../../src/platform/outbox/infrastructure/database/repository/integration-outbox-repository.adapter';
import { IntegrationEventEnvelope } from '../../../../src/shared/application/messaging/integration-event-envelope';

describe('integration outbox repository adapter', () => {
  const now = new Date('2026-09-02T12:00:00.000Z');

  it('appends a pending message with its stable identity and contract', async () => {
    const em = entityManagerStub();
    const message = envelope();

    await new IntegrationOutboxRepositoryAdapter(em as never).append([message]);

    expect(em.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: message.id,
        deduplicationKey: message.deduplicationKey,
        eventType: 'billing.order-issued.v1',
        aggregateVersion: 1,
        eventPosition: 0,
        payload: message.payload,
        status: 'PENDING',
        availableAt: message.createdAt,
        claimCount: 0,
        publishAttemptCount: 0,
      }),
    );
    expect(em.persist).toHaveBeenCalledTimes(1);
    expect(em.flush).toHaveBeenCalledTimes(1);
  });

  it('claims due or expired head messages with a database-clock lease', async () => {
    const em = entityManagerStub();
    em.execute.mockResolvedValueOnce([claimedRow()]);
    const adapter = new IntegrationOutboxRepositoryAdapter(em as never);

    const claimed = await adapter.claimBatch({
      workerId: 'worker-1',
      batchSize: 20,
      leaseDurationMs: 30_000,
    });

    expect(claimed).toHaveLength(1);
    expect(claimed[0]).toMatchObject({
      lockToken: '00000000-0000-4000-8000-000000000099',
      publishAttemptCount: 2,
    });
    expect(claimed[0]?.envelope).toMatchObject({
      id: '00000000-0000-4000-8000-000000000010',
      eventType: 'billing.order-issued.v1',
    });
    const sql = em.execute.mock.calls[0][0];
    expect(sql).toMatch(/for update skip locked/i);
    expect(sql).toMatch(/clock_timestamp\(\)/i);
    expect(sql).toMatch(/not exists/i);
    expect(sql).toMatch(/claim_count.*claim_count.*1/is);
    expect(em.transactional).toHaveBeenCalledTimes(1);
  });

  it('updates publish outcomes only while the lease token still matches', async () => {
    const em = entityManagerStub();
    em.execute.mockResolvedValue([{ id: envelope().id }]);
    const adapter = new IntegrationOutboxRepositoryAdapter(em as never);
    const lease = {
      messageId: envelope().id,
      lockToken: '00000000-0000-4000-8000-000000000099',
    };

    await expect(adapter.recordPublishAttempt(lease)).resolves.toBe(true);
    await expect(adapter.markPublished(lease)).resolves.toBe(true);
    await expect(
      adapter.reschedule({
        ...lease,
        delayMs: 5_000,
        errorMessage: 'network\nsecret-looking detail',
      }),
    ).resolves.toBe(true);
    await expect(
      adapter.markDead({ ...lease, errorMessage: 'unsupported schema' }),
    ).resolves.toBe(true);

    for (const [sql] of em.execute.mock.calls) {
      expect(sql).toMatch(/lock_token/i);
      expect(sql).toMatch(/status = 'PROCESSING'/i);
    }
    const retryCall = em.execute.mock.calls[2];
    expect(retryCall[1]).toContain('network secret-looking detail');
  });

  function envelope(): IntegrationEventEnvelope {
    return IntegrationEventEnvelope.of({
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
      payload: { billingOrderId: '00000000-0000-4000-8000-000000000001' },
      occurredAt: now,
      createdAt: now,
    });
  }

  function claimedRow(): Record<string, unknown> {
    return {
      id: '00000000-0000-4000-8000-000000000010',
      deduplication_key:
        'vote-service:BillingOrder:00000000-0000-4000-8000-000000000001:1:BillingOrderIssued:0',
      source: 'vote-service',
      event_type: 'billing.order-issued.v1',
      schema_version: 1,
      aggregate_type: 'BillingOrder',
      aggregate_id: '00000000-0000-4000-8000-000000000001',
      aggregate_version: 1,
      event_position: 0,
      payload: { billingOrderId: '00000000-0000-4000-8000-000000000001' },
      occurred_at: now,
      created_at: now,
      correlation_id: null,
      causation_id: null,
      lock_token: '00000000-0000-4000-8000-000000000099',
      publish_attempt_count: 2,
    };
  }

  function entityManagerStub() {
    const execute = jest.fn<
      Promise<unknown[]>,
      [string, readonly unknown[]?]
    >();
    const em = {
      create: jest.fn(
        (_entity: unknown, data: Record<string, unknown>) => data,
      ),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      execute,
      getConnection: jest.fn(() => ({ execute })),
      getTransactionContext: jest.fn().mockReturnValue('tx-context'),
      transactional: jest.fn(
        async (work: (transactionalEm: unknown) => Promise<unknown>) =>
          work(em),
      ),
    };
    // The recursive transactional test double is intentionally structural.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return em;
  }
});
