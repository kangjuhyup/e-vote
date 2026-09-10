import { ConfigService } from '@nestjs/config';

import { AuthAccountAlreadyExistsError } from '../../../src/modules/user-profile/application/port/auth-account-registration.port';
import { AuthAdminAccountRegistrationAdapter } from '../../../src/modules/user-profile/infrastructure/auth/auth-admin-account-registration.adapter';

function loginResponse() {
  return new Response(undefined, {
    status: 201,
    headers: { 'set-cookie': 'admin_session=session-token; Path=/; HttpOnly' },
  });
}

describe('AuthAdminAccountRegistrationAdapter', () => {
  const config = new ConfigService({
    VOTE_AUTH_ADMIN_BASE_URL: 'http://auth-service:3000',
    VOTE_AUTH_ADMIN_USERNAME: 'admin',
    VOTE_AUTH_ADMIN_PASSWORD: 'admin-password',
  });

  afterEach(() => jest.restoreAllMocks());

  it('creates an active user through the Auth admin API', async () => {
    const fetcher = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(loginResponse())
      .mockResolvedValueOnce(Response.json({ items: [] }))
      .mockResolvedValueOnce(Response.json({ items: [] }))
      .mockResolvedValueOnce(Response.json({ items: [] }))
      .mockResolvedValueOnce(
        Response.json({ id: 'auth-user-1' }, { status: 201 }),
      );
    const adapter = new AuthAdminAccountRegistrationAdapter(config);

    await expect(
      adapter.register({
        tenantCode: 'acme',
        username: 'voter01',
        password: 'password123',
        email: 'voter@example.com',
        phone: '+821012345678',
      }),
    ).resolves.toEqual({ userPrincipalId: 'auth-user-1' });

    expect(fetcher.mock.calls[4][0]).toBe(
      'http://auth-service:3000/t/acme/admin/users',
    );
    expect(JSON.parse(fetcher.mock.calls[4][1]?.body as string)).toEqual({
      username: 'voter01',
      password: 'password123',
      email: 'voter@example.com',
      phone: '+821012345678',
      status: 'ACTIVE',
    });
  });

  it('maps an Auth duplicate response to the application conflict', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(loginResponse())
      .mockResolvedValueOnce(
        Response.json({ items: [{ username: 'voter01' }] }),
      );
    const adapter = new AuthAdminAccountRegistrationAdapter(config);

    await expect(
      adapter.register({
        tenantCode: 'acme',
        username: 'voter01',
        password: 'password123',
        email: 'voter@example.com',
        phone: '+821012345678',
      }),
    ).rejects.toBeInstanceOf(AuthAccountAlreadyExistsError);
  });
});
