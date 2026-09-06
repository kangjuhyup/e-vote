import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  ParticipationInvitationRecipientAccessPort,
  ParticipationInvitationRecipientReference,
} from '../../../../application/port/capability/participation-invitation-recipient-access.port';
import {
  IDENTITY_DATA_PROTECTOR_PORT,
  type IdentityDataProtectorPort,
} from '../../../../../../shared/application/port/security/identity-data-protector.port';
import { isPersonalDataCiphertext } from '../../../../../../platform/security/personal-data-cipher';

interface RecipientRow {
  readonly id: string;
  readonly has_phone_number: boolean;
}

@Injectable()
export class ParticipationInvitationRecipientAccessAdapter implements ParticipationInvitationRecipientAccessPort {
  constructor(
    private readonly em: EntityManager,
    @Inject(IDENTITY_DATA_PROTECTOR_PORT)
    private readonly protector: IdentityDataProtectorPort,
  ) {}

  async findEligibleRecipients(params: {
    readonly voteId: string;
    readonly electorIds?: readonly string[];
  }): Promise<readonly ParticipationInvitationRecipientReference[]> {
    if (params.electorIds && params.electorIds.length === 0) return [];
    const idPredicate = params.electorIds
      ? `and id in (${params.electorIds.map(() => '?').join(', ')})`
      : '';
    const queryParams = params.electorIds
      ? [params.voteId, ...params.electorIds]
      : [params.voteId];
    const rows = await this.em.getConnection().execute<RecipientRow[]>(
      `select id, phone_number is not null as has_phone_number
       from electors
       where vote_id = ? and status = 'ELIGIBLE' ${idPredicate}
       order by id`,
      queryParams,
      'all',
      this.em.getTransactionContext(),
    );
    return rows.map((row) => ({
      electorId: row.id,
      hasPhoneNumber: row.has_phone_number,
    }));
  }

  async findPhoneNumber(
    voteId: string,
    electorId: string,
  ): Promise<string | undefined> {
    const rows = await this.em
      .getConnection()
      .execute<Array<{ phone_number: string | null }>>(
        `select phone_number from electors
       where vote_id = ? and id = ? and status = 'ELIGIBLE'`,
        [voteId, electorId],
        'all',
        this.em.getTransactionContext(),
      );
    const value = rows[0]?.phone_number;
    if (!value) return undefined;
    return isPersonalDataCiphertext(value)
      ? this.protector.reveal(value)
      : value;
  }
}
