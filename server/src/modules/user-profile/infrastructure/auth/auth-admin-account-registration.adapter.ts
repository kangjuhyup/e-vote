import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AuthAccountAlreadyExistsError,
  type AuthAccountRegistrationPort,
} from '../../application/port/auth-account-registration.port';

@Injectable()
export class AuthAdminAccountRegistrationAdapter implements AuthAccountRegistrationPort {
  constructor(private readonly config: ConfigService) {}

  async register(input: {
    tenantCode: string;
    username: string;
    password: string;
    email: string;
    phone: string;
  }): Promise<{ userPrincipalId: string }> {
    const baseUrl = this.requireBaseUrl();
    const cookie = await this.login(baseUrl);
    if (await this.hasExistingAccount(baseUrl, cookie, input)) {
      throw new AuthAccountAlreadyExistsError();
    }
    const response = await fetch(
      `${baseUrl}/t/${encodeURIComponent(input.tenantCode)}/admin/users`,
      {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({
          username: input.username,
          password: input.password,
          email: input.email,
          phone: input.phone,
          status: 'ACTIVE',
        }),
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (response.status === 409) throw new AuthAccountAlreadyExistsError();
    if (!response.ok) {
      throw new Error(`AUTH_ACCOUNT_CREATE_FAILED_${response.status}`);
    }
    const body = (await response.json()) as {
      id?: unknown;
      data?: { id?: unknown };
    };
    const id = body.id ?? body.data?.id;
    if (typeof id !== 'string' || !id) {
      throw new Error('AUTH_ACCOUNT_CREATE_RESPONSE_INVALID');
    }
    return { userPrincipalId: id };
  }

  private async hasExistingAccount(
    baseUrl: string,
    cookie: string,
    input: {
      tenantCode: string;
      username: string;
      email: string;
      phone: string;
    },
  ): Promise<boolean> {
    for (const [field, value] of [
      ['username', input.username],
      ['email', input.email.toLowerCase()],
      ['phone', input.phone],
    ] as const) {
      const response = await fetch(
        `${baseUrl}/t/${encodeURIComponent(input.tenantCode)}/admin/users?page=1&limit=100&search=${encodeURIComponent(value)}`,
        { headers: { cookie }, signal: AbortSignal.timeout(5_000) },
      );
      if (!response.ok) {
        throw new Error(`AUTH_ACCOUNT_LIST_FAILED_${response.status}`);
      }
      const body = (await response.json()) as {
        items?: Array<Record<string, unknown>>;
        data?: { items?: Array<Record<string, unknown>> };
      };
      const items = body.items ?? body.data?.items ?? [];
      if (
        items.some((item) => {
          const candidate = item[field];
          return (
            typeof candidate === 'string' &&
            (field === 'email' ? candidate.toLowerCase() : candidate) === value
          );
        })
      ) {
        return true;
      }
    }
    return false;
  }

  async remove(input: {
    tenantCode: string;
    userPrincipalId: string;
  }): Promise<void> {
    const baseUrl = this.requireBaseUrl();
    const cookie = await this.login(baseUrl);
    const response = await fetch(
      `${baseUrl}/t/${encodeURIComponent(input.tenantCode)}/admin/users/${encodeURIComponent(input.userPrincipalId)}`,
      {
        method: 'DELETE',
        headers: { cookie },
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok && response.status !== 404) {
      throw new Error(`AUTH_ACCOUNT_DELETE_FAILED_${response.status}`);
    }
  }

  private requireBaseUrl(): string {
    const value = (
      this.config.get<string>('VOTE_AUTH_ADMIN_BASE_URL') ??
      this.config.get<string>('AUTH_OIDC_ISSUER')
    )?.trim();
    if (!value) throw new Error('VOTE_AUTH_ADMIN_BASE_URL_REQUIRED');
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      throw new Error('VOTE_AUTH_ADMIN_BASE_URL_INVALID');
    }
    return url.toString().replace(/\/+$/, '');
  }

  private async login(baseUrl: string): Promise<string> {
    const username = (
      this.config.get<string>('VOTE_AUTH_ADMIN_USERNAME') ??
      this.config.get<string>('AUTH_ADMIN_USERNAME')
    )?.trim();
    const password =
      this.config.get<string>('VOTE_AUTH_ADMIN_PASSWORD') ??
      this.config.get<string>('AUTH_ADMIN_PASSWORD');
    if (!username || !password) {
      throw new Error('VOTE_AUTH_ADMIN_CREDENTIALS_REQUIRED');
    }
    const response = await fetch(`${baseUrl}/admin/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(`AUTH_ADMIN_LOGIN_FAILED_${response.status}`);
    }
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(';', 1)[0])
      .join('; ');
    if (!cookie) throw new Error('AUTH_ADMIN_SESSION_COOKIE_MISSING');
    return cookie;
  }
}
