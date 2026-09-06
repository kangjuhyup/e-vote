import { MockParticipationInvitationSmsSenderAdapter } from '../../../src/modules/participation/infrastructure/sms/mock-participation-invitation-sms-sender.adapter';

describe('MockParticipationInvitationSmsSenderAdapter', () => {
  const request = {
    phoneNumber: 'sensitive-value',
    message: 'sensitive-link',
    idempotencyKey: 'participation-invitation:invitation-1:1',
  };

  it('succeeds below the 90 percent threshold', async () => {
    const adapter = new MockParticipationInvitationSmsSenderAdapter(
      () => 0.899,
    );
    await expect(adapter.send(request)).resolves.toBeUndefined();
  });

  it('fails at or above the 90 percent threshold without leaking payloads', async () => {
    const adapter = new MockParticipationInvitationSmsSenderAdapter(() => 0.9);
    let error: unknown;
    try {
      await adapter.send(request);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      'mock invitation SMS delivery failed',
    );
    expect((error as Error).message).not.toContain(request.phoneNumber);
    expect((error as Error).message).not.toContain(request.message);
  });
});
