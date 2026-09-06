import type { ProcessParticipationInvitationDeliveryHandler } from '../../../src/modules/participation/application/command/handler/process-participation-invitation-delivery.handler';
import type { ParticipationAccessRepositoryPort } from '../../../src/modules/participation/application/port/persistence/command/participation-access-repository.port';
import { ParticipationInvitationSmsWorker } from '../../../src/modules/participation/infrastructure/sms/participation-invitation-sms.worker';

/* eslint-disable @typescript-eslint/unbound-method -- Jest verifies injected method mocks without invoking an unbound implementation. */

describe('ParticipationInvitationSmsWorker', () => {
  it('claims and sends invitation deliveries through batch-core', async () => {
    const repository = repositoryStub();
    repository.claimDeliveryBatch.mockResolvedValueOnce([
      {
        id: 'delivery-1',
        invitationId: 'invitation-1',
        invitationGeneration: 1,
        lockToken: 'lock-1',
        attemptCount: 1,
      },
    ]);
    const handler = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ProcessParticipationInvitationDeliveryHandler>;
    const worker = new ParticipationInvitationSmsWorker(repository, handler);

    await expect(worker.dispatchOnce()).resolves.toBe(1);

    const [claim] = repository.claimDeliveryBatch.mock.calls[0];
    expect(claim.workerId).toMatch(/^participation-invitation-/);
    expect(claim).toMatchObject({ batchSize: 20, leaseDurationMs: 30_000 });
    expect(handler.execute).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'delivery-1' }),
    );
  });

  it('reschedules a failed send without exposing provider input', async () => {
    const repository = repositoryStub();
    repository.claimDeliveryBatch.mockResolvedValueOnce([
      {
        id: 'delivery-1',
        invitationId: 'invitation-1',
        invitationGeneration: 1,
        lockToken: 'lock-1',
        attemptCount: 1,
      },
    ]);
    const handler = {
      execute: jest.fn().mockRejectedValue(new Error('provider unavailable')),
    } as unknown as jest.Mocked<ProcessParticipationInvitationDeliveryHandler>;
    const worker = new ParticipationInvitationSmsWorker(repository, handler);

    await expect(worker.dispatchOnce()).resolves.toBe(1);

    const [rescheduled] = repository.rescheduleDelivery.mock.calls[0];
    expect(rescheduled).toMatchObject({
      id: 'delivery-1',
      lockToken: 'lock-1',
      errorMessage: 'provider unavailable',
    });
    expect(rescheduled.availableAt).toBeInstanceOf(Date);
    expect(rescheduled.now).toBeInstanceOf(Date);
  });

  function repositoryStub() {
    return {
      claimDeliveryBatch: jest.fn().mockResolvedValue([]),
      rescheduleDelivery: jest.fn().mockResolvedValue(true),
      markDeliveryDead: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<ParticipationAccessRepositoryPort>;
  }
});
