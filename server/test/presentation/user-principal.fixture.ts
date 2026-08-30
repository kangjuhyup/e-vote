import { UserPrincipal } from '../../src/shared/application/security/user-principal';

export const TEST_USER_PRINCIPAL = UserPrincipal.of({
  id: 'test-user-1',
  tenantCode: 'acme',
  username: 'test-admin',
  email: 'test-admin@example.com',
  roles: ['ADMIN'],
  scopes: ['openid', 'profile', 'email'],
});
