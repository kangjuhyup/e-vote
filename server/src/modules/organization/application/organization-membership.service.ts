import { createHash, createHmac, randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UserPrincipal } from '../../../shared/application/security/user-principal';
import { normalizeKoreanMobileNumber } from '../../../shared/domain/korean-mobile-number';
import {
  OrganizationInvitationAggregate,
  type OrganizationInvitationRole,
} from '../domain/organization-invitation.aggregate';
import {
  OrganizationApplicationAccessDeniedError,
  OrganizationApplicationNotFoundError,
  OrganizationInvitationExpiredError,
  OrganizationInvitationNotFoundError,
  OrganizationInvitationRecipientMismatchError,
  OrganizationProvisioningUnavailableError,
} from './organization-onboarding.error';
import {
  AUTH_ORGANIZATION_PROVISIONING_PORT,
  type AuthOrganizationUser,
  type AuthOrganizationProvisioningPort,
} from './port/gateway/auth-organization-provisioning.port';
import {
  ORGANIZATION_APPLICATION_REPOSITORY_PORT,
  type OrganizationApplicationRepositoryPort,
} from './port/persistence/organization-application-repository.port';
import {
  ORGANIZATION_INVITATION_REPOSITORY_PORT,
  type OrganizationInvitationRepositoryPort,
} from './port/persistence/organization-invitation-repository.port';

@Injectable()
export class OrganizationMembershipService {
  constructor(
    @Inject(ORGANIZATION_APPLICATION_REPOSITORY_PORT)
    private readonly organizations: OrganizationApplicationRepositoryPort,
    @Inject(ORGANIZATION_INVITATION_REPOSITORY_PORT)
    private readonly invitations: OrganizationInvitationRepositoryPort,
    @Inject(AUTH_ORGANIZATION_PROVISIONING_PORT)
    private readonly auth: AuthOrganizationProvisioningPort,
    private readonly config: ConfigService,
  ) {}

  async createInvitation(
    user: UserPrincipal,
    input: {
      organizationGroupId: string;
      contact: string;
      role: OrganizationInvitationRole;
    },
  ) {
    const organization = await this.requireManagedOrganization(
      user,
      input.organizationGroupId,
    );
    const contact = normalizeContact(input.contact);
    const token = randomBytes(32).toString('base64url');
    const invitedAt = new Date();
    const invitation = OrganizationInvitationAggregate.create({
      id: this.invitations.nextId(),
      tenantId: organization.props.tenantId,
      tenantCode: organization.props.tenantCode,
      organizationGroupId: organization.props.authOrganizationGroupId!,
      organizationGroupCode: organization.props.authOrganizationGroupCode!,
      organizationName: organization.props.organizationName,
      managerGroupId: organization.props.authManagerGroupId!,
      managerGroupCode: organization.props.authManagerGroupCode!,
      contactType: contact.type,
      contactHash: this.contactHash(contact.value),
      contactHint: maskContact(contact.value, contact.type),
      tokenHash: tokenHash(token),
      role: input.role,
      invitedByUserPrincipalId: user.id,
      invitedAt,
      expiresAt: new Date(invitedAt.getTime() + 7 * 24 * 60 * 60 * 1_000),
    });
    await this.invitations.save(invitation);
    return { invitation, token };
  }

  async getInvitation(token: string) {
    const invitation = await this.invitations.findByTokenHash(tokenHash(token));
    if (!invitation) throw new OrganizationInvitationNotFoundError();
    return invitation;
  }

  async acceptInvitation(user: UserPrincipal, token: string) {
    const invitation = await this.getInvitation(token);
    if (invitation.props.status === 'ACCEPTED') {
      if (invitation.props.acceptedByUserPrincipalId !== user.id)
        throw new OrganizationInvitationRecipientMismatchError();
      return invitation;
    }
    if (!invitation.canBeAccepted(new Date()))
      throw new OrganizationInvitationExpiredError();
    if (
      user.tenantId !== invitation.props.tenantId ||
      user.tenantCode !== invitation.props.tenantCode
    ) {
      throw new OrganizationInvitationRecipientMismatchError();
    }
    let authUser: AuthOrganizationUser | undefined;
    try {
      authUser = await this.auth.getUser({
        tenantCode: invitation.props.tenantCode,
        userId: user.id,
      });
    } catch {
      throw new OrganizationProvisioningUnavailableError();
    }
    const contacts =
      invitation.props.contactType === 'EMAIL'
        ? [authUser?.email]
        : [authUser?.phone];
    if (
      !authUser ||
      authUser.status !== 'ACTIVE' ||
      !contacts.some(
        (value) =>
          value &&
          this.contactHash(normalizeContact(value).value) ===
            invitation.props.contactHash,
      )
    ) {
      throw new OrganizationInvitationRecipientMismatchError();
    }
    try {
      await this.auth.addUserToOrganization({
        tenantCode: invitation.props.tenantCode,
        userId: user.id,
        organizationGroupId: invitation.props.organizationGroupId,
        ...(invitation.props.role === 'MANAGER'
          ? { managerGroupId: invitation.props.managerGroupId }
          : {}),
      });
    } catch {
      throw new OrganizationProvisioningUnavailableError();
    }
    return this.invitations.markAccepted({
      id: invitation.props.id,
      userPrincipalId: user.id,
      acceptedAt: new Date(),
    });
  }

  async getInvitationPage(
    user: UserPrincipal,
    organizationGroupId: string,
    page: number,
    pageSize: number,
  ) {
    const organization = await this.requireManagedOrganization(
      user,
      organizationGroupId,
    );
    return this.invitations.findPage({
      tenantId: organization.props.tenantId,
      organizationGroupId,
      page,
      pageSize,
    });
  }

  private async requireManagedOrganization(
    user: UserPrincipal,
    organizationGroupId: string,
  ) {
    if (!user.tenantId) throw new OrganizationApplicationAccessDeniedError();
    const organization =
      await this.organizations.findApprovedByOrganizationGroupId(
        user.tenantId,
        organizationGroupId,
      );
    if (!organization) throw new OrganizationApplicationNotFoundError();
    if (
      !organization.props.authOrganizationGroupCode ||
      !organization.props.authManagerGroupId ||
      !organization.props.authManagerGroupCode ||
      !user.managesOrganization({
        organizationGroupId,
        organizationGroupCode: organization.props.authOrganizationGroupCode,
      })
    ) {
      throw new OrganizationApplicationAccessDeniedError();
    }
    return organization;
  }

  private contactHash(value: string) {
    const secret = this.config
      .get<string>('ORGANIZATION_INVITATION_HASH_SECRET')
      ?.trim();
    if (!secret) throw new OrganizationProvisioningUnavailableError();
    return createHmac('sha256', secret).update(value).digest('hex');
  }
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
function normalizeContact(raw: string): {
  type: 'EMAIL' | 'PHONE';
  value: string;
} {
  const value = raw.trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { type: 'EMAIL', value };
  try {
    return { type: 'PHONE', value: normalizeKoreanMobileNumber(value) };
  } catch {
    // Fall through to the contact validation error below.
  }
  throw new TypeError(
    'invitation contact must be a valid email or phone number',
  );
}
function maskContact(value: string, type: 'EMAIL' | 'PHONE') {
  if (type === 'EMAIL') {
    const [local, domain] = value.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}
