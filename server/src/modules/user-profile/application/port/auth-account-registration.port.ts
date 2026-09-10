export const AUTH_ACCOUNT_REGISTRATION_PORT = Symbol(
  'AUTH_ACCOUNT_REGISTRATION_PORT',
);

export class AuthAccountAlreadyExistsError extends Error {}

export interface AuthAccountRegistrationPort {
  register(input: {
    tenantCode: string;
    username: string;
    password: string;
    email: string;
    phone: string;
  }): Promise<{ userPrincipalId: string }>;
  remove(input: { tenantCode: string; userPrincipalId: string }): Promise<void>;
}
