import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  AuthOrganizationProvisioningPort,
  AuthOrganizationProvisioningResult,
} from '../../application/port/gateway/auth-organization-provisioning.port';

type AuthItem = { id: string; code: string; parentId?: string | null };

@Injectable()
export class AuthAdminOrganizationProvisioningAdapter implements AuthOrganizationProvisioningPort {
  constructor(private readonly config: ConfigService) {}

  async provision(input: {
    tenantCode: string;
    applicantUserId: string;
    organizationName: string;
    organizationManagementNumber: string;
  }): Promise<AuthOrganizationProvisioningResult> {
    const baseUrl = this.requireBaseUrl();
    const cookie = await this.login(baseUrl);
    const tenantPath = `/t/${encodeURIComponent(input.tenantCode)}/admin`;
    const organizationGroup = await this.ensureGroup({
      baseUrl,
      cookie,
      tenantPath,
      code: input.organizationManagementNumber,
      name: input.organizationName,
    });
    const managerCode = `${input.organizationManagementNumber}.vote-managers`;
    const managerGroup = await this.ensureGroup({
      baseUrl,
      cookie,
      tenantPath,
      code: managerCode,
      name: `${input.organizationName} 투표 관리자`,
      parentId: organizationGroup.id,
    });
    if (managerGroup.parentId !== organizationGroup.id) {
      throw new Error('AUTH_MANAGER_GROUP_PARENT_MISMATCH');
    }
    const role = await this.findByCode(
      baseUrl,
      cookie,
      `${tenantPath}/roles`,
      'vote-manager',
    );
    if (!role) throw new Error('AUTH_VOTE_MANAGER_ROLE_NOT_FOUND');

    await this.requireOkOrNoOp(
      `${baseUrl}${tenantPath}/groups/${encodeURIComponent(managerGroup.id)}/roles/${encodeURIComponent(role.id)}`,
      { method: 'POST', headers: { cookie } },
    );
    for (const group of [organizationGroup, managerGroup]) {
      await this.requireOkOrNoOp(
        `${baseUrl}${tenantPath}/users/${encodeURIComponent(input.applicantUserId)}/groups/${encodeURIComponent(group.id)}`,
        { method: 'POST', headers: { cookie } },
      );
    }

    return {
      organizationGroup: {
        id: organizationGroup.id,
        code: organizationGroup.code,
      },
      managerGroup: {
        id: managerGroup.id,
        code: managerGroup.code,
        parentId: organizationGroup.id,
      },
    };
  }

  private requireBaseUrl() {
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

  private async login(baseUrl: string) {
    const username = (
      this.config.get<string>('VOTE_AUTH_ADMIN_USERNAME') ??
      this.config.get<string>('AUTH_ADMIN_USERNAME')
    )?.trim();
    const password =
      this.config.get<string>('VOTE_AUTH_ADMIN_PASSWORD') ??
      this.config.get<string>('AUTH_ADMIN_PASSWORD');
    if (!username || !password)
      throw new Error('VOTE_AUTH_ADMIN_CREDENTIALS_REQUIRED');
    const response = await fetch(`${baseUrl}/admin/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok)
      throw new Error(`AUTH_ADMIN_LOGIN_FAILED_${response.status}`);
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(';', 1)[0])
      .join('; ');
    if (!cookie) throw new Error('AUTH_ADMIN_SESSION_COOKIE_MISSING');
    return cookie;
  }

  private async ensureGroup(input: {
    baseUrl: string;
    cookie: string;
    tenantPath: string;
    code: string;
    name: string;
    parentId?: string;
  }): Promise<AuthItem> {
    const path = `${input.tenantPath}/groups`;
    const existing = await this.findByCode(
      input.baseUrl,
      input.cookie,
      path,
      input.code,
    );
    if (existing) {
      if ((existing.parentId ?? undefined) !== input.parentId) {
        throw new Error('AUTH_GROUP_PARENT_MISMATCH');
      }
      return existing;
    }
    const response = await fetch(`${input.baseUrl}${path}`, {
      method: 'POST',
      headers: { cookie: input.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        code: input.code,
        name: input.name,
        ...(input.parentId ? { parentId: input.parentId } : {}),
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (response.status === 409) {
      const raced = await this.findByCode(
        input.baseUrl,
        input.cookie,
        path,
        input.code,
      );
      if (raced) return raced;
    }
    if (!response.ok)
      throw new Error(`AUTH_GROUP_CREATE_FAILED_${response.status}`);
    const body = (await response.json()) as {
      id?: string;
      data?: { id?: string };
    };
    const id = body.id ?? body.data?.id;
    if (!id) throw new Error('AUTH_GROUP_CREATE_RESPONSE_INVALID');
    return { id, code: input.code, parentId: input.parentId ?? null };
  }

  private async findByCode(
    baseUrl: string,
    cookie: string,
    path: string,
    code: string,
  ): Promise<AuthItem | undefined> {
    const limit = 100;
    for (let page = 1; ; page += 1) {
      const response = await fetch(
        `${baseUrl}${path}?page=${page}&limit=${limit}`,
        {
          headers: { cookie },
          signal: AbortSignal.timeout(5_000),
        },
      );
      if (!response.ok) throw new Error(`AUTH_LIST_FAILED_${response.status}`);
      const body = (await response.json()) as {
        items?: AuthItem[];
        total?: number;
        data?: { items?: AuthItem[]; total?: number };
      };
      const items = body.items ?? body.data?.items ?? [];
      const match = items.find((item) => item.code === code);
      if (match) return match;
      const total = body.total ?? body.data?.total;
      if (
        items.length < limit ||
        (total !== undefined && page * limit >= total)
      ) {
        return undefined;
      }
    }
  }

  private async requireOkOrNoOp(url: string, init: RequestInit) {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok && response.status !== 409) {
      throw new Error(`AUTH_ASSIGNMENT_FAILED_${response.status}`);
    }
  }
}
