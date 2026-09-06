import {
  ParticipationAccessNotConfiguredError,
  createParticipationAccessTokenAdapter,
  resolveParticipationUiUrl,
  resolveParticipationAllowedOrigins,
} from '../../../src/modules/participation/infrastructure/security/participation-access-token.config';

describe('participation access token config', () => {
  it('keeps the application bootable but fails closed when no signing key exists', () => {
    const adapter = createParticipationAccessTokenAdapter({});
    expect(() => adapter.issueReference('invitation-1', 1)).toThrow(
      ParticipationAccessNotConfiguredError,
    );
  });

  it('uses a dedicated signing key and UI URL without exposing secret config', () => {
    const adapter = createParticipationAccessTokenAdapter({
      PARTICIPATION_LINK_SIGNING_KEY: 'a-dedicated-key-with-at-least-32-bytes',
      PARTICIPATION_LINK_SIGNING_KEY_ID: 'key-2026',
    });
    expect(
      adapter.verifyReference(adapter.issueReference('invitation-1', 1).token),
    ).toMatchObject({
      invitationId: 'invitation-1',
      keyId: 'key-2026',
    });
    expect(resolveParticipationUiUrl({})).toBe(
      'http://localhost:3001/participate',
    );
  });

  it('rejects wildcard credentialed origins', () => {
    expect(() =>
      resolveParticipationAllowedOrigins({
        PARTICIPATION_ALLOWED_ORIGINS: '*,http://localhost:3001',
      }),
    ).toThrow('wildcard origin is not allowed');
  });
});
