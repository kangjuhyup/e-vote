import type { ProcessDueVoteSchedulesHandler } from '../../../src/modules/vote/application/command/handler/process-due-vote-schedules.handler';
import { VoteScheduleWorker } from '../../../src/modules/vote/infrastructure/scheduling/vote-schedule.worker';

describe('VoteScheduleWorker', () => {
  it('starts immediately, polls through batch-core, and stops cleanly', async () => {
    const handler = handlerStub();
    const worker = new VoteScheduleWorker(handler);

    await worker.onApplicationBootstrap();
    await worker.onApplicationShutdown();

    expect(handler.execute.mock.calls).toHaveLength(1);
    const [command] = handler.execute.mock.calls[0];
    expect(command.batchSize).toBe(20);
    expect(command.now).toBeInstanceOf(Date);
  });

  it('does not overlap schedule processing', async () => {
    let finish: (() => void) | undefined;
    const handler = handlerStub();
    handler.execute.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = () =>
          resolve({ openedCount: 1, closedCount: 0, processedCount: 1 });
      }) as never,
    );
    const worker = new VoteScheduleWorker(handler);
    const now = new Date('2026-09-06T10:00:00.000Z');

    const first = worker.dispatchOnce(now);
    const second = worker.dispatchOnce(now);
    expect(handler.execute.mock.calls).toHaveLength(1);

    finish?.();
    await expect(Promise.all([first, second])).resolves.toEqual([1, 1]);
  });

  function handlerStub() {
    return {
      execute: jest.fn().mockResolvedValue({
        openedCount: 0,
        closedCount: 0,
        processedCount: 0,
      }),
    } as unknown as jest.Mocked<ProcessDueVoteSchedulesHandler>;
  }
});
