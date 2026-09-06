import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  ElectoralRollPageRequest,
  ElectoralRollReadRepositoryPort,
} from '../../../../application/port/persistence/query/electoral-roll-read-repository.port';
import {
  ElectoralRollMemberView,
  ElectoralRollPageItemView,
  ElectoralRollPageView,
  ElectoralRollView,
} from '../../../../application/query/dto/response/electoral-roll.view';
import {
  SELECT_IN_RELATION_LOAD_OPTIONS,
  getDatabaseEntities,
  loadedItems,
  type LoadedCollectionLike,
} from '../../../../../../platform/database/repository/database-repository.util';
import {
  IDENTITY_DATA_PROTECTOR_PORT,
  type IdentityDataProtectorPort,
} from '../../../../../../shared/application/port/security/identity-data-protector.port';
import { Inject } from '@nestjs/common';

type ElectoralRollMemberReadPersistence = {
  readonly id: string;
  readonly identifier: string;
  readonly groupKey: string | null;
  readonly voteWeight: number | string;
  readonly encryptedName: string | null;
  readonly encryptedPhoneNumber: string | null;
  readonly encryptedBirthDate: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

type ElectoralRollReadPersistence = {
  readonly id: string;
  readonly name: string;
  readonly revision: number;
  readonly memberCount: number | string;
  readonly members: LoadedCollectionLike<ElectoralRollMemberReadPersistence>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

@Injectable()
export class ElectoralRollReadRepositoryAdapter implements ElectoralRollReadRepositoryPort {
  constructor(
    private readonly em: EntityManager,
    @Inject(IDENTITY_DATA_PROTECTOR_PORT)
    private readonly identityDataProtector: IdentityDataProtectorPort,
  ) {}

  async findDetailById(
    electoralRollId: string,
    userPrincipalId: string,
  ): Promise<ElectoralRollView | undefined> {
    const { ElectoralRollEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      ElectoralRollEntity as any,
      {
        id: electoralRollId,
        deletedAt: null,
        accessGrants: { userPrincipalId },
      } as any,
      {
        populate: ['members'],
        ...SELECT_IN_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as ElectoralRollReadPersistence | null;

    if (!entity) return undefined;

    return ElectoralRollView.of({
      id: entity.id,
      name: entity.name,
      revision: entity.revision,
      members: loadedItems(entity.members)
        .map((member) =>
          ElectoralRollMemberView.of({
            id: member.id,
            electoralRollId: entity.id,
            identifier: member.identifier,
            groupKey: member.groupKey ?? undefined,
            voteWeight: Number(member.voteWeight),
            name: this.reveal(member.encryptedName),
            phoneNumber: this.reveal(member.encryptedPhoneNumber),
            birthDate: this.reveal(member.encryptedBirthDate),
            createdAt: member.createdAt,
            updatedAt: member.updatedAt,
          }),
        )
        .sort(
          (a, b) =>
            a.identifier.localeCompare(b.identifier) ||
            a.id.localeCompare(b.id),
        ),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async findPage(
    request: ElectoralRollPageRequest,
  ): Promise<ElectoralRollPageView> {
    const { ElectoralRollEntity } = await getDatabaseEntities();
    const where: Record<string, unknown> = {
      deletedAt: null,
      accessGrants: { userPrincipalId: request.userPrincipalId },
    };
    if (request.query !== undefined) {
      where.name = { $ilike: `%${request.query}%` };
    }

    const [entities, totalItems] = (await this.em.findAndCount(
      ElectoralRollEntity as any,
      where,
      {
        limit: request.pageSize,
        offset: (request.page - 1) * request.pageSize,
        orderBy: { updatedAt: 'desc', id: 'desc' },
        ...SELECT_IN_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as [ElectoralRollReadPersistence[], number];

    return ElectoralRollPageView.of({
      items: entities.map((entity) =>
        ElectoralRollPageItemView.of({
          id: entity.id,
          name: entity.name,
          revision: entity.revision,
          memberCount: Number(entity.memberCount),
          updatedAt: entity.updatedAt,
        }),
      ),
      page: request.page,
      pageSize: request.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / request.pageSize),
    });
  }

  private reveal(value: string | null): string | undefined {
    return value === null
      ? undefined
      : this.identityDataProtector.reveal(value);
  }
}
