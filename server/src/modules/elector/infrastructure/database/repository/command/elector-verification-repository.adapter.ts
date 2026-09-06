import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  ElectorVerificationRepositoryPort,
  RecordElectorVerification,
} from '../../../../application/port/persistence/command/elector-verification-repository.port';
import {
  ElectorParticipantForbiddenError,
  type ElectorParticipantAccessPort,
} from '../../../../../../shared/application/port/capability/elector-participant-access.port';
import { DomainError } from '../../../../../../shared/domain/domain-error';
import { nextRepositoryId } from '../../../../../../platform/database/repository/database-repository.util';
import { isMockElectorVerificationEnabled } from '../../../security/elector-identity-verification.config';

interface LockedElector {
  status: string;
  identifier: string;
  identity_name_hash: string | null;
  phone_number_hash: string | null;
  identity_birth_date_hash: string | null;
}

@Injectable()
export class ElectorVerificationRepositoryAdapter
  implements ElectorVerificationRepositoryPort, ElectorParticipantAccessPort
{
  private readonly allowMock = isMockElectorVerificationEnabled();
  constructor(private readonly em: EntityManager) {}

  async isAuthorized(
    voteId: string,
    electorId: string,
    userPrincipalId: string,
  ): Promise<boolean> {
    if (!userPrincipalId?.trim()) return false;
    const rows = await this.em.getConnection().execute<Array<{ id: string }>>(
      `select v.id from elector_identity_verifications v
       join electors e on e.id = v.elector_id
       where e.id = ? and e.vote_id = ? and e.status = 'ELIGIBLE'
         and v.user_principal_id = ? and v.status = 'SUCCESS'
         and (v.is_mock = false or ? = true) limit 1`,
      [electorId, voteId, userPrincipalId, this.allowMock],
      'all',
      this.em.getTransactionContext(),
    );
    return rows.length > 0;
  }

  async record(params: RecordElectorVerification): Promise<boolean> {
    if (!params.userPrincipalId?.trim())
      throw new ElectorParticipantForbiddenError();
    if (params.result.isMock && !this.allowMock)
      throw new ElectorParticipantForbiddenError();
    try {
      return await this.em.transactional(async (em) => {
        const rows = await em.getConnection().execute<LockedElector[]>(
          `select status, identifier, identity_name_hash, phone_number_hash, identity_birth_date_hash
           from electors where id = ? and vote_id = ? for update`,
          [params.elector.id, params.elector.voteId],
          'all',
          em.getTransactionContext(),
        );
        const elector = rows[0];
        if (!elector || elector.status !== 'ELIGIBLE')
          throw new DomainError('elector is not eligible');
        if (
          elector.identifier !== params.elector.identifier ||
          (elector.identity_name_hash ?? undefined) !==
            params.elector.identityNameHash ||
          (elector.phone_number_hash ?? undefined) !==
            params.elector.identityPhoneNumberHash ||
          (elector.identity_birth_date_hash ?? undefined) !==
            params.elector.identityBirthDateHash
        ) {
          throw new DomainError('elector identity changed during verification');
        }
        const owners = await em
          .getConnection()
          .execute<Array<{ user_principal_id: string }>>(
            `select user_principal_id from elector_identity_verifications
           where elector_id = ? and status = 'SUCCESS' and user_principal_id is not null`,
            [params.elector.id],
            'all',
            em.getTransactionContext(),
          );
        if (
          owners.some(
            (owner) => owner.user_principal_id !== params.userPrincipalId,
          )
        ) {
          throw new ElectorParticipantForbiddenError();
        }
        await em.getConnection().execute(
          `insert into elector_identity_verifications
            (id, elector_id, user_principal_id, provider, method, status,
             provider_transaction_id, is_mock, failure_reason, requested_at, verified_at, created_at)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp,
                   case when ? then current_timestamp else null end, current_timestamp)`,
          [
            nextRepositoryId(),
            params.elector.id,
            params.userPrincipalId,
            params.result.provider,
            params.result.method,
            params.result.verified ? 'SUCCESS' : 'FAILED',
            params.transactionId,
            params.result.isMock,
            params.result.verified ? null : 'VERIFICATION_FAILED',
            params.result.verified,
          ],
          'all',
          em.getTransactionContext(),
        );
        // Return this attempt's outcome, never upgrade a failed attempt from an earlier success.
        return params.result.verified;
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        (('code' in error && error.code === '23505') ||
          ('name' in error &&
            error.name === 'UniqueConstraintViolationException'))
      ) {
        throw new DomainError(
          'identity verification transaction was already consumed',
        );
      }
      throw error;
    }
  }
}
