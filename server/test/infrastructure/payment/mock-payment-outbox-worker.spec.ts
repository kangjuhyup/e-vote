import type { IntegrationEventOutboxDispatcher } from '../../../src/shared/application/messaging/integration-event-outbox.dispatcher';
import { MockPaymentOutboxWorker } from '../../../src/modules/billing/infrastructure/payment/mock-payment-outbox.worker';

describe('mock payment outbox worker', () => {
  it('dispatches immediately in mock mode and stops cleanly', async () => {
    const dispatcher = dispatcherStub();
    const worker = new MockPaymentOutboxWorker(dispatcher, 'mock');

    await worker.onApplicationBootstrap();
    await worker.onApplicationShutdown();

    expect(dispatcher.dispatchBatch.mock.calls).toContainEqual([
      expect.objectContaining({
        batchSize: 20,
        leaseDurationMs: 30_000,
      }),
    ]);
  });

  it('does not dispatch when payment integration is disabled', async () => {
    const dispatcher = dispatcherStub();
    const worker = new MockPaymentOutboxWorker(dispatcher, 'disabled');

    await worker.onApplicationBootstrap();
    await worker.onApplicationShutdown();

    expect(dispatcher.dispatchBatch.mock.calls).toHaveLength(0);
  });

  it('immediately drains another batch while claimed messages remain', async () => {
    const dispatcher = dispatcherStub();
    dispatcher.dispatchBatch
      .mockResolvedValueOnce(dispatchResult(1))
      .mockResolvedValueOnce(dispatchResult());
    const worker = new MockPaymentOutboxWorker(dispatcher, 'mock');

    await worker.onApplicationBootstrap();
    await waitForDispatchCount(dispatcher, 2);
    await worker.onApplicationShutdown();

    expect(dispatcher.dispatchBatch.mock.calls).toHaveLength(2);
  });

  it('does not overlap polling batches', async () => {
    let finishDispatch: (() => void) | undefined;
    const dispatcher = dispatcherStub();
    dispatcher.dispatchBatch.mockReturnValueOnce(
      new Promise((resolve) => {
        finishDispatch = () => resolve(dispatchResult());
      }),
    );
    const worker = new MockPaymentOutboxWorker(dispatcher, 'mock');

    const first = worker.dispatchOnce();
    const second = worker.dispatchOnce();
    await waitForDispatchCount(dispatcher, 1);
    expect(dispatcher.dispatchBatch.mock.calls).toHaveLength(1);

    finishDispatch?.();
    await Promise.all([first, second]);
  });

  it('uses one stable worker identity for database lease ownership', async () => {
    const dispatcher = dispatcherStub();
    const worker = new MockPaymentOutboxWorker(dispatcher, 'mock');

    await worker.dispatchOnce();
    await worker.dispatchOnce();

    const [firstRequest] = dispatcher.dispatchBatch.mock.calls[0];
    const [secondRequest] = dispatcher.dispatchBatch.mock.calls[1];
    expect(firstRequest.workerId).toMatch(/^mock-payment-/);
    expect(secondRequest.workerId).toBe(firstRequest.workerId);
  });

  function dispatcherStub() {
    return {
      dispatchBatch: jest.fn().mockResolvedValue(dispatchResult()),
    } as unknown as jest.Mocked<IntegrationEventOutboxDispatcher>;
  }

  async function waitForDispatchCount(
    dispatcher: jest.Mocked<IntegrationEventOutboxDispatcher>,
    expectedCount: number,
  ): Promise<void> {
    while (dispatcher.dispatchBatch.mock.calls.length < expectedCount) {
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }

  function dispatchResult(claimedCount = 0) {
    return {
      claimedCount,
      publishedCount: 0,
      rescheduledCount: 0,
      deadCount: 0,
      lostLeaseCount: 0,
    };
  }
});
