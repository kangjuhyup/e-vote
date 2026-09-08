import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import { nextRepositoryId } from '../../../../../platform/database/repository/database-repository.util';
import { getDatabaseEntities } from '../../../../../platform/database/repository/database-repository.util';
import {
  OrganizationApplicationConflictError,
  OrganizationApplicationNotFoundError,
} from '../../../application/organization-onboarding.error';
import type {
  OrganizationApplicationPageResult,
  OrganizationApplicationRepositoryPort,
} from '../../../application/port/persistence/organization-application-repository.port';
import {
  OrganizationApplicationAggregate,
  type OrganizationApplicationProps,
  type OrganizationApplicationStatus,
} from '../../../domain/organization-application.aggregate';

type MutableProps = {
  -readonly [
    Key in keyof OrganizationApplicationProps
  ]: OrganizationApplicationProps[Key];
};

type Persistence = Omit<
  MutableProps,
  | 'contactPhone'
  | 'reviewerUserPrincipalId'
  | 'reviewedAt'
  | 'rejectionReason'
  | 'authOrganizationGroupId'
  | 'authOrganizationGroupCode'
  | 'authManagerGroupId'
  | 'authManagerGroupCode'
  | 'authManagerParentGroupId'
  | 'provisioningError'
> & {
  contactPhone: string | null;
  reviewerUserPrincipalId: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  authOrganizationGroupId: string | null;
  authOrganizationGroupCode: string | null;
  authManagerGroupId: string | null;
  authManagerGroupCode: string | null;
  authManagerParentGroupId: string | null;
  provisioningError: string | null;
  updatedAt: Date;
};

@Injectable()
export class OrganizationApplicationRepositoryAdapter implements OrganizationApplicationRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  async save(application: OrganizationApplicationAggregate): Promise<void> {
    const { OrganizationApplicationEntity } = await getDatabaseEntities();
    const props = application.props;
    const entity = this.em.create(
      OrganizationApplicationEntity as never,
      {
        ...props,
        contactPhone: props.contactPhone ?? null,
        reviewerUserPrincipalId: props.reviewerUserPrincipalId ?? null,
        reviewedAt: props.reviewedAt ?? null,
        rejectionReason: props.rejectionReason ?? null,
        authOrganizationGroupId: props.authOrganizationGroupId ?? null,
        authOrganizationGroupCode: props.authOrganizationGroupCode ?? null,
        authManagerGroupId: props.authManagerGroupId ?? null,
        authManagerGroupCode: props.authManagerGroupCode ?? null,
        authManagerParentGroupId: props.authManagerParentGroupId ?? null,
        provisioningError: props.provisioningError ?? null,
        updatedAt: new Date(),
      } as never,
    );
    this.em.persist(entity);
    await this.em.flush();
  }

  async findCurrentByApplicant(tenantId: string, applicantId: string) {
    const { OrganizationApplicationEntity } = await getDatabaseEntities();
    const row = (await this.em.findOne(
      OrganizationApplicationEntity as never,
      { tenantId, applicantUserPrincipalId: applicantId },
      { orderBy: { submittedAt: 'desc' } } as never,
    )) as unknown as Persistence | null;
    return row ? this.toDomain(row) : undefined;
  }

  async findById(id: string) {
    const { OrganizationApplicationEntity } = await getDatabaseEntities();
    const row = (await this.em.findOne(OrganizationApplicationEntity as never, {
      id,
    })) as unknown as Persistence | null;
    return row ? this.toDomain(row) : undefined;
  }

  async findPage(input: {
    tenantId: string;
    page: number;
    pageSize: number;
    status?: OrganizationApplicationStatus;
  }): Promise<OrganizationApplicationPageResult> {
    const { OrganizationApplicationEntity } = await getDatabaseEntities();
    const [rows, totalItems] = (await this.em.findAndCount(
      OrganizationApplicationEntity as never,
      {
        tenantId: input.tenantId,
        ...(input.status ? { status: input.status } : {}),
      },
      {
        limit: input.pageSize,
        offset: (input.page - 1) * input.pageSize,
        orderBy: { submittedAt: 'desc' },
      } as never,
    )) as unknown as [Persistence[], number];
    return {
      items: rows.map((row) => this.toDomain(row)),
      page: input.page,
      pageSize: input.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / input.pageSize),
    };
  }

  async beginProvisioning(input: {
    id: string;
    tenantId: string;
    reviewerId: string;
    reviewedAt: Date;
    retry: boolean;
  }) {
    return this.em.transactional(async (em) => {
      const { OrganizationApplicationEntity } = await getDatabaseEntities();
      const row = (await em.findOne(
        OrganizationApplicationEntity as never,
        { id: input.id, tenantId: input.tenantId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )) as unknown as Persistence | null;
      if (!row) throw new OrganizationApplicationNotFoundError();
      const allowed = input.retry
        ? row.status === 'PROVISIONING_FAILED'
        : row.status === 'PENDING';
      if (!allowed) throw new OrganizationApplicationConflictError();
      row.status = 'PROVISIONING';
      row.reviewerUserPrincipalId = input.reviewerId;
      row.reviewedAt = input.reviewedAt;
      row.provisioningError = null;
      row.updatedAt = new Date();
      await em.flush();
      return this.toDomain(row);
    });
  }

  async markApproved(input: {
    id: string;
    authOrganizationGroupId: string;
    authOrganizationGroupCode: string;
    authManagerGroupId: string;
    authManagerGroupCode: string;
    authManagerParentGroupId: string;
  }) {
    return this.updateLocked(input.id, (row) => {
      if (row.status !== 'PROVISIONING') {
        throw new OrganizationApplicationConflictError();
      }
      Object.assign(row, input, {
        status: 'APPROVED',
        provisioningError: null,
      });
    });
  }

  async markProvisioningFailed(
    id: string,
    sanitizedError: string,
  ): Promise<void> {
    await this.updateLocked(id, (row) => {
      if (row.status === 'PROVISIONING') {
        row.status = 'PROVISIONING_FAILED';
        row.provisioningError = sanitizedError.slice(0, 512);
      }
    });
  }

  async reject(input: {
    id: string;
    reviewerId: string;
    reviewedAt: Date;
    rejectionReason: string;
  }) {
    return this.updateLocked(input.id, (row) => {
      if (row.status !== 'PENDING')
        throw new OrganizationApplicationConflictError();
      row.status = 'REJECTED';
      row.reviewerUserPrincipalId = input.reviewerId;
      row.reviewedAt = input.reviewedAt;
      row.rejectionReason = input.rejectionReason;
    });
  }

  private async updateLocked(id: string, update: (row: Persistence) => void) {
    return this.em.transactional(async (em) => {
      const { OrganizationApplicationEntity } = await getDatabaseEntities();
      const row = (await em.findOne(
        OrganizationApplicationEntity as never,
        { id },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )) as unknown as Persistence | null;
      if (!row) throw new OrganizationApplicationNotFoundError();
      update(row);
      row.updatedAt = new Date();
      await em.flush();
      return this.toDomain(row);
    });
  }

  private toDomain(row: Persistence) {
    return OrganizationApplicationAggregate.restore({
      ...row,
      contactPhone: row.contactPhone ?? undefined,
      reviewerUserPrincipalId: row.reviewerUserPrincipalId ?? undefined,
      reviewedAt: row.reviewedAt ?? undefined,
      rejectionReason: row.rejectionReason ?? undefined,
      authOrganizationGroupId: row.authOrganizationGroupId ?? undefined,
      authOrganizationGroupCode: row.authOrganizationGroupCode ?? undefined,
      authManagerGroupId: row.authManagerGroupId ?? undefined,
      authManagerGroupCode: row.authManagerGroupCode ?? undefined,
      authManagerParentGroupId: row.authManagerParentGroupId ?? undefined,
      provisioningError: row.provisioningError ?? undefined,
    });
  }
}
