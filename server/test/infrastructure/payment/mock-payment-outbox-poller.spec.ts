import type { IntegrationEventOutboxDispatcher } from '../../../src/shared/application/messaging/integration-event-outbox.dispatcher';
import { MockPaymentOutboxPoller } from '../../../src/modules/billing/infrastructure/payment/mock-payment-outbox.poller';

describe('mock payment outbox poller', () => {
  it('dispatches immediately in mock mode and stops cleanly', async () => {
    const dispatcher = dispatcherStub();
    const poller = new MockPaymentOutboxPoller(dispatcher, 'mock');

    poller.onApplicationBootstrap();
    await poller.onApplicationShutdown();

    expect(dispatcher.dispatchBatch.mock.calls).toContainEqual([
      expect.objectContaining({
        batchSize: 20,
        leaseDurationMs: 30_000,
      }),
    ]);
  });

  it('does not dispatch when payment integration is disabled', async () => {
    const dispatcher = dispatcherStub();
    const poller = new MockPaymentOutboxPoller(dispatcher, 'disabled');

    poller.onApplicationBootstrap();
    await poller.onApplicationShutdown();

    expect(dispatcher.dispatchBatch.mock.calls).toHaveLength(0);
  });

  it('does not overlap polling batches', async () => {
    let finishDispatch: (() => void) | undefined;
    const dispatcher = dispatcherStub();
    dispatcher.dispatchBatch.mockReturnValueOnce(
      new Promise((resolve) => {
        finishDispatch = () => resolve(dispatchResult());
      }),
    );
    const poller = new MockPaymentOutboxPoller(dispatcher, 'mock');

    const first = poller.dispatchOnce();
    const second = poller.dispatchOnce();
    expect(dispatcher.dispatchBatch.mock.calls).toHaveLength(1);

    finishDispatch?.();
    await Promise.all([first, second]);
  });

  function dispatcherStub() {
    return {
      dispatchBatch: jest.fn().mockResolvedValue(dispatchResult()),
    } as unknown as jest.Mocked<IntegrationEventOutboxDispatcher>;
  }

  function dispatchResult() {
    return {
      claimedCount: 0,
      publishedCount: 0,
      rescheduledCount: 0,
      deadCount: 0,
      lostLeaseCount: 0,
    };
  }
});
