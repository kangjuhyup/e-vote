import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  ClaimedParticipationInvitationDelivery,
  ParticipationAccessRepositoryPort,
} from '../../../../application/port/persistence/command/participation-access-repository.port';
import type { ElectorParticipantSessionAggregate } from '../../../../domain/access/elector-participant-session.aggregate';
import type { ParticipationInvitationAggregate } from '../../../../domain/access/participation-invitation.aggregate';
import {
  ParticipationAccessMapper,
  type ElectorParticipantSessionPersistence,
} from '../../mapper/participation-access.mapper';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  entityReference,
  getDatabaseEntities,
  nextRepositoryId,
  saveEntity,
} from '../../../../../../platform/database/repository/database-repository.util';

interface InvitationRow {
  readonly id: string;
  readonly vote_id: string;
  readonly elector_id: string;
  readonly token_digest: string;
  readonly expires_at: Date | string | null;
  readonly generation: number;
  readonly claimed_at: Date | string | null;
  readonly claimed_session_id: string | null;
  readonly revoked_at: Date | string | null;
  readonly issued_by_user_principal_id: string | null;
  readonly signing_key_id: string | null;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
}

interface ClaimedDeliveryRow {
  readonly id: string;
  readonly invitation_id: string;
  readonly invitation_generation: number;
  readonly lock_token: string;
  readonly attempt_count: number;
}

@Injectable()
export class ParticipationAccessRepositoryAdapter implements ParticipationAccessRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  async findInvitationByElectorForUpdate(
    voteId: string,
    electorId: string,
  ): Promise<ParticipationInvitationAggregate | undefined> {
    return this.findInvitation(
      'vote_id = ? and elector_id = ?',
      [voteId, electorId],
      { lock: true, removeLegacy: true },
    );
  }

  async findInvitationsByElectorsForUpdate(
    voteId: string,
    electorIds: readonly string[],
  ): Promise<readonly ParticipationInvitationAggregate[]> {
    if (electorIds.length === 0) return [];
    const rows = await this.em.getConnection().execute<InvitationRow[]>(
      `select * from participation_invitations
       where vote_id = ? and elector_id in (${electorIds.map(() => '?').join(', ')}) for update`,
      [voteId, ...electorIds],
      'all',
      this.em.getTransactionContext(),
    );
    const legacyIds = rows
      .filter((row) => this.isLegacyInvitation(row))
      .map((row) => row.id);
    if (legacyIds.length > 0) {
      await this.em.getConnection().execute(
        `delete from participation_invitations
         where id in (${legacyIds.map(() => '?').join(', ')}) and generation = 0`,
        legacyIds,
        'run',
        this.em.getTransactionContext(),
      );
    }
    return rows
      .filter((row) => !this.isLegacyInvitation(row))
      .map((row) => this.mapInvitationRow(row));
  }

  async findInvitationByIdForUpdate(
    invitationId: string,
  ): Promise<ParticipationInvitationAggregate | undefined> {
    return this.findInvitation('id = ?', [invitationId], {
      lock: true,
      removeLegacy: false,
    });
  }

  async findInvitationById(
    invitationId: string,
  ): Promise<ParticipationInvitationAggregate | undefined> {
    return this.findInvitation('id = ?', [invitationId], {
      lock: false,
      removeLegacy: false,
    });
  }

  async saveInvitation(
    invitation: ParticipationInvitationAggregate,
  ): Promise<void> {
    const { ParticipationInvitationEntity, VoteEntity, ElectorEntity } =
      await getDatabaseEntities();
    const value = ParticipationAccessMapper.invitationToPersistence(invitation);
    await saveEntity(
      this.em,
      ParticipationInvitationEntity,
      invitation.id,
      { createdAt: value.createdAt },
      {
        vote: entityReference(this.em, VoteEntity, invitation.voteId),
        elector: entityReference(this.em, ElectorEntity, invitation.electorId),
        tokenDigest: value.tokenDigest,
        expiresAt: null,
        generation: value.generation,
        claimedAt: value.claimedAt,
        claimedSessionId: value.claimedSessionId,
        revokedAt: value.revokedAt,
        issuedByUserPrincipalId: value.issuedByUserPrincipalId,
        signingKeyId: value.signingKeyId,
        updatedAt: value.updatedAt,
      },
    );
  }

  async saveInvitations(
    invitations: readonly ParticipationInvitationAggregate[],
  ): Promise<void> {
    for (const chunk of this.chunks(invitations, 500)) {
      const values = chunk
        .map(() => '(?, ?, ?, ?, null, ?, ?, ?, ?, ?, ?, ?, ?)')
        .join(', ');
      const parameters = chunk.flatMap((invitation) => {
        const value =
          ParticipationAccessMapper.invitationToPersistence(invitation);
        return [
          value.id,
          value.vote.id,
          value.elector.id,
          value.tokenDigest,
          value.generation,
          value.claimedAt,
          value.claimedSessionId,
          value.revokedAt,
          value.issuedByUserPrincipalId,
          value.signingKeyId,
          value.createdAt,
          value.updatedAt,
        ];
      });
      await this.em.getConnection().execute(
        `insert into participation_invitations
           (id, vote_id, elector_id, token_digest, expires_at, generation,
            claimed_at, claimed_session_id, revoked_at,
            issued_by_user_principal_id, signing_key_id, created_at, updated_at)
         values ${values}
         on conflict (vote_id, elector_id) do update set
           token_digest = excluded.token_digest,
           generation = excluded.generation,
           claimed_at = excluded.claimed_at,
           claimed_session_id = excluded.claimed_session_id,
           revoked_at = excluded.revoked_at,
           issued_by_user_principal_id = excluded.issued_by_user_principal_id,
           signing_key_id = excluded.signing_key_id,
           updated_at = excluded.updated_at`,
        parameters,
        'run',
        this.em.getTransactionContext(),
      );
    }
  }

  async findSessionByTokenDigest(
    tokenDigest: string,
  ): Promise<ElectorParticipantSessionAggregate | undefined> {
    return this.findSession({ tokenDigest });
  }

  async findSessionById(
    sessionId: string,
  ): Promise<ElectorParticipantSessionAggregate | undefined> {
    return this.findSession({ id: sessionId });
  }

  async saveSession(
    session: ElectorParticipantSessionAggregate,
  ): Promise<void> {
    const {
      ElectorParticipantSessionEntity,
      ParticipationInvitationEntity,
      VoteEntity,
      ElectorEntity,
    } = await getDatabaseEntities();
    const value = ParticipationAccessMapper.sessionToPersistence(session);
    await saveEntity(
      this.em,
      ElectorParticipantSessionEntity,
      session.id,
      { createdAt: value.createdAt },
      {
        tokenDigest: value.tokenDigest,
        csrfTokenDigest: value.csrfTokenDigest,
        invitation: entityReference(
          this.em,
          ParticipationInvitationEntity,
          session.invitationId,
        ),
        vote: entityReference(this.em, VoteEntity, session.voteId),
        elector: entityReference(this.em, ElectorEntity, session.electorId),
        invitationGeneration: value.invitationGeneration,
        scope: value.scope,
        expiresAt: value.expiresAt,
        revokedAt: value.revokedAt,
        lastUsedAt: value.lastUsedAt,
      },
    );
  }

  async revokeSessionsForInvitation(
    invitationId: string,
    now: Date,
  ): Promise<void> {
    await this.executeRevocation(
      'update elector_participant_sessions set revoked_at = coalesce(revoked_at, ?), last_used_at = ? where invitation_id = ? and revoked_at is null',
      [now, now, invitationId],
    );
  }

  async revokeSessionsForInvitations(
    invitationIds: readonly string[],
    now: Date,
  ): Promise<void> {
    if (invitationIds.length === 0) return;
    await this.executeRevocation(
      `update elector_participant_sessions
       set revoked_at = coalesce(revoked_at, ?), last_used_at = ?
       where invitation_id in (${invitationIds.map(() => '?').join(', ')})
         and revoked_at is null`,
      [now, now, ...invitationIds],
    );
  }

  async revokeSessionByTokenDigest(
    tokenDigest: string,
    now: Date,
  ): Promise<void> {
    await this.executeRevocation(
      'update elector_participant_sessions set revoked_at = coalesce(revoked_at, ?), last_used_at = ? where token_digest = ? and revoked_at is null',
      [now, now, tokenDigest],
    );
  }

  async revokeAccessForVote(voteId: string, now: Date): Promise<void> {
    await this.executeRevocation(
      'update participation_invitations set revoked_at = coalesce(revoked_at, ?), updated_at = ? where vote_id = ? and revoked_at is null',
      [now, now, voteId],
    );
    await this.executeRevocation(
      'update elector_participant_sessions set revoked_at = coalesce(revoked_at, ?), last_used_at = ? where vote_id = ? and revoked_at is null',
      [now, now, voteId],
    );
  }

  async revokeAccessForElector(electorId: string, now: Date): Promise<void> {
    await this.executeRevocation(
      'update participation_invitations set revoked_at = coalesce(revoked_at, ?), updated_at = ? where elector_id = ? and revoked_at is null',
      [now, now, electorId],
    );
    await this.executeRevocation(
      'update elector_participant_sessions set revoked_at = coalesce(revoked_at, ?), last_used_at = ? where elector_id = ? and revoked_at is null',
      [now, now, electorId],
    );
  }

  async enqueueDelivery(
    params: Parameters<ParticipationAccessRepositoryPort['enqueueDelivery']>[0],
  ): Promise<void> {
    const {
      ParticipationInvitationDeliveryEntity,
      ParticipationInvitationEntity,
    } = await getDatabaseEntities();
    const entity = this.em.create(
      ParticipationInvitationDeliveryEntity as never,
      {
        id: params.id,
        invitation: entityReference(
          this.em,
          ParticipationInvitationEntity,
          params.invitationId,
        ),
        invitationGeneration: params.invitationGeneration,
        status: params.status,
        availableAt: params.now,
        attemptCount: 0,
        lockedBy: null,
        lockToken: null,
        lockedUntil: null,
        deliveredAt: null,
        lastError: null,
        createdAt: params.now,
        updatedAt: params.now,
      } as never,
    );
    this.em.persist(entity);
    await this.em.flush();
  }

  async enqueueDeliveries(
    deliveries: ReadonlyArray<
      Parameters<ParticipationAccessRepositoryPort['enqueueDelivery']>[0]
    >,
  ): Promise<void> {
    for (const chunk of this.chunks(deliveries, 500)) {
      const values = chunk
        .map(() => '(?, ?, ?, ?, ?, 0, null, null, null, null, null, ?, ?)')
        .join(', ');
      await this.em.getConnection().execute(
        `insert into participation_invitation_deliveries
           (id, invitation_id, invitation_generation, status, available_at,
            attempt_count, locked_by, lock_token, locked_until, delivered_at,
            last_error, created_at, updated_at)
         values ${values}
         on conflict (invitation_id, invitation_generation) do nothing`,
        chunk.flatMap((delivery) => [
          delivery.id,
          delivery.invitationId,
          delivery.invitationGeneration,
          delivery.status,
          delivery.now,
          delivery.now,
          delivery.now,
        ]),
        'run',
        this.em.getTransactionContext(),
      );
    }
  }

  async claimDeliveryBatch(params: {
    readonly workerId: string;
    readonly batchSize: number;
    readonly leaseDurationMs: number;
  }): Promise<readonly ClaimedParticipationInvitationDelivery[]> {
    const lockToken = randomUUID();
    return this.em.transactional(async (transactionalEm) => {
      const rows = await transactionalEm
        .getConnection()
        .execute<ClaimedDeliveryRow[]>(
          `with claimable as (
           select id from participation_invitation_deliveries
           where (status = 'PENDING' and available_at <= clock_timestamp())
              or (status = 'PROCESSING' and locked_until <= clock_timestamp())
           order by available_at, created_at, id
           limit ? for update skip locked
         )
         update participation_invitation_deliveries delivery
         set status = 'PROCESSING', locked_by = ?, lock_token = ?,
             locked_until = clock_timestamp() + (? * interval '1 millisecond'),
             attempt_count = attempt_count + 1, updated_at = clock_timestamp()
         from claimable where delivery.id = claimable.id
         returning delivery.id, delivery.invitation_id,
                   delivery.invitation_generation, delivery.lock_token,
                   delivery.attempt_count`,
          [
            params.batchSize,
            params.workerId,
            lockToken,
            params.leaseDurationMs,
          ],
          'all',
          transactionalEm.getTransactionContext(),
        );
      return rows.map((row) => ({
        id: row.id,
        invitationId: row.invitation_id,
        invitationGeneration: Number(row.invitation_generation),
        lockToken: row.lock_token,
        attemptCount: Number(row.attempt_count),
      }));
    });
  }

  markDeliverySent(
    params: Parameters<
      ParticipationAccessRepositoryPort['markDeliverySent']
    >[0],
  ): Promise<boolean> {
    return this.updateDelivery(
      `status = 'SENT', delivered_at = ?, last_error = null`,
      [params.now],
      params.id,
      params.lockToken,
      params.now,
    );
  }

  markDeliverySkipped(
    params: Parameters<
      ParticipationAccessRepositoryPort['markDeliverySkipped']
    >[0],
  ): Promise<boolean> {
    return this.updateDelivery(
      `status = 'SKIPPED', last_error = ?`,
      [this.sanitizeError(params.reason)],
      params.id,
      params.lockToken,
      params.now,
    );
  }

  rescheduleDelivery(
    params: Parameters<
      ParticipationAccessRepositoryPort['rescheduleDelivery']
    >[0],
  ): Promise<boolean> {
    return this.updateDelivery(
      `status = 'PENDING', available_at = ?, last_error = ?`,
      [params.availableAt, this.sanitizeError(params.errorMessage)],
      params.id,
      params.lockToken,
      params.now,
    );
  }

  markDeliveryDead(
    params: Parameters<
      ParticipationAccessRepositoryPort['markDeliveryDead']
    >[0],
  ): Promise<boolean> {
    return this.updateDelivery(
      `status = 'DEAD', last_error = ?`,
      [this.sanitizeError(params.errorMessage)],
      params.id,
      params.lockToken,
      params.now,
    );
  }

  private async findInvitation(
    predicate: string,
    parameters: readonly string[],
    options: { readonly lock: boolean; readonly removeLegacy: boolean },
  ): Promise<ParticipationInvitationAggregate | undefined> {
    const rows = await this.em
      .getConnection()
      .execute<InvitationRow[]>(
        `select * from participation_invitations where ${predicate}${options.lock ? ' for update' : ''}`,
        parameters,
        'all',
        this.em.getTransactionContext(),
      );
    const row = rows[0];
    if (!row) return undefined;
    if (this.isLegacyInvitation(row)) {
      if (options.removeLegacy) {
        await this.em
          .getConnection()
          .execute(
            'delete from participation_invitations where id = ? and generation = 0',
            [row.id],
            'run',
            this.em.getTransactionContext(),
          );
      }
      return undefined;
    }
    return this.mapInvitationRow(row);
  }

  private isLegacyInvitation(row: InvitationRow): boolean {
    return (
      Number(row.generation) < 1 ||
      !row.issued_by_user_principal_id ||
      !row.signing_key_id
    );
  }

  private mapInvitationRow(
    row: InvitationRow,
  ): ParticipationInvitationAggregate {
    return ParticipationAccessMapper.invitationToDomain({
      id: row.id,
      vote: { id: row.vote_id },
      elector: { id: row.elector_id },
      tokenDigest: row.token_digest,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      generation: Number(row.generation),
      claimedAt: row.claimed_at ? new Date(row.claimed_at) : null,
      claimedSessionId: row.claimed_session_id,
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
      issuedByUserPrincipalId: row.issued_by_user_principal_id,
      signingKeyId: row.signing_key_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  private async findSession(
    where: Record<string, string>,
  ): Promise<ElectorParticipantSessionAggregate | undefined> {
    const { ElectorParticipantSessionEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      ElectorParticipantSessionEntity as never,
      where,
      {
        populate: ['invitation', 'vote', 'elector'],
        ...JOINED_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as ElectorParticipantSessionPersistence | null;
    return entity
      ? ParticipationAccessMapper.sessionToDomain(entity)
      : undefined;
  }

  private async executeRevocation(
    sql: string,
    parameters: readonly unknown[],
  ): Promise<void> {
    await this.em
      .getConnection()
      .execute(sql, parameters, 'run', this.em.getTransactionContext());
  }

  private async updateDelivery(
    assignments: string,
    assignmentParams: readonly unknown[],
    id: string,
    lockToken: string,
    now: Date,
  ): Promise<boolean> {
    const rows = await this.em
      .getConnection()
      .execute<ReadonlyArray<{ id: string }>>(
        `update participation_invitation_deliveries
       set ${assignments}, locked_by = null, lock_token = null,
           locked_until = null, updated_at = ?
       where id = ? and lock_token = ? and status = 'PROCESSING'
       returning id`,
        [...assignmentParams, now, id, lockToken],
        'all',
        this.em.getTransactionContext(),
      );
    return rows.length === 1;
  }

  private sanitizeError(message: string): string {
    return message.replace(/\s+/g, ' ').trim().slice(0, 500);
  }

  private chunks<T>(values: readonly T[], size: number): readonly T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < values.length; index += size) {
      chunks.push(values.slice(index, index + size));
    }
    return chunks;
  }
}
