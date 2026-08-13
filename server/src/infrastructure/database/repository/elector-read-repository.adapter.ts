import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  ElectorPageRequest,
  ElectorReadRepositoryPort,
} from '../../../application/port/elector-read-repository.port';
import {
  ElectorPageView,
  ElectorView,
} from '../../../application/query/elector.view';
import type { ElectorStatus } from '../../../domain/elector/type/elector-status.type';
import { isPersonalDataCiphertext } from '../../security/personal-data-cipher';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  getDatabaseEntities,
  loadedItems,
  type DatabaseEntity,
  type LoadedCollectionLike,
} from './database-repository.util';

const ELECTOR_READ_RELATIONS = ['vote', 'identityVerifications'] as const;
const SUCCESSFUL_IDENTITY_VERIFICATION_STATUS = 'SUCCESS';

type ElectorReadPersistence = {
  readonly id: string;
  readonly vote: { readonly id: string };
  readonly name: string;
  readonly identifier: string;
  readonly phoneNumber: string | null;
  readonly birthDate: string | null;
  readonly groupKey: string | null;
  readonly voteWeight: number | string;
  readonly status: ElectorStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly identityVerifications: LoadedCollectionLike<DatabaseEntity>;
};

@Injectable()
export class ElectorReadRepositoryAdapter implements ElectorReadRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async findDetailById(
    voteId: string,
    electorId: string,
  ): Promise<ElectorView | undefined> {
    const { ElectorEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      ElectorEntity as any,
      {
        id: electorId,
        vote: { id: voteId },
      } as any,
      {
        populate: ELECTOR_READ_RELATIONS,
        ...JOINED_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as ElectorReadPersistence | null;

    return entity ? this.toView(entity) : undefined;
  }

  async findPage(request: ElectorPageRequest): Promise<ElectorPageView> {
    const { ElectorEntity } = await getDatabaseEntities();
    const [entities, totalItems] = (await this.em.findAndCount(
      ElectorEntity as any,
      { vote: { id: request.voteId } } as any,
      {
        populate: ELECTOR_READ_RELATIONS,
        limit: request.pageSize,
        offset: (request.page - 1) * request.pageSize,
        orderBy: {
          createdAt: 'desc',
          id: 'desc',
        },
        ...JOINED_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as [ElectorReadPersistence[], number];

    return ElectorPageView.of({
      items: entities.map((entity) => this.toView(entity)),
      page: request.page,
      pageSize: request.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / request.pageSize),
    });
  }

  private toView(entity: ElectorReadPersistence): ElectorView {
    return ElectorView.of({
      id: entity.id,
      voteId: entity.vote.id,
      name: this.toDisplayName(entity),
      identifier: entity.identifier,
      phoneNumber: this.toDisplayPersonalData(entity.phoneNumber),
      birthDate: this.toDisplayPersonalData(entity.birthDate),
      groupKey: entity.groupKey ?? undefined,
      voteWeight: Number(entity.voteWeight),
      status: entity.status,
      identityVerified: this.hasSuccessfulIdentityVerification(entity),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toDisplayName(entity: ElectorReadPersistence): string {
    return isPersonalDataCiphertext(entity.name)
      ? entity.identifier
      : entity.name;
  }

  private toDisplayPersonalData(value: string | null): string | undefined {
    if (value === null || isPersonalDataCiphertext(value)) {
      return undefined;
    }

    return value;
  }

  private hasSuccessfulIdentityVerification(
    entity: ElectorReadPersistence,
  ): boolean {
    return loadedItems<DatabaseEntity>(entity.identityVerifications).some(
      (verification) =>
        verification.status === SUCCESSFUL_IDENTITY_VERIFICATION_STATUS,
    );
  }
}
