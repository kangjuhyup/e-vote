import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  DevelopmentParticipationInvitationReference,
  DevelopmentParticipationLinkReadPort,
} from '../../../../application/port/persistence/query/development-participation-link-read.port';

interface DevelopmentParticipationInvitationRow {
  readonly id: string;
  readonly vote_id: string;
  readonly elector_id: string;
  readonly token_digest: string;
  readonly signing_key_id: string;
  readonly generation: number;
}

@Injectable()
export class DevelopmentParticipationLinkReadAdapter implements DevelopmentParticipationLinkReadPort {
  constructor(private readonly em: EntityManager) {}

  async findCurrentInvitation(params: {
    readonly voteId: string;
    readonly electorId: string;
  }): Promise<DevelopmentParticipationInvitationReference | undefined> {
    const rows = await this.em
      .getConnection()
      .execute<DevelopmentParticipationInvitationRow[]>(
        `select id, vote_id, elector_id, token_digest, signing_key_id, generation
         from participation_invitations
         where vote_id = ?
           and elector_id = ?
           and revoked_at is null
           and generation > 0
           and signing_key_id is not null
         limit 1`,
        [params.voteId, params.electorId],
        'all',
        this.em.getTransactionContext(),
      );
    const row = rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      voteId: row.vote_id,
      electorId: row.elector_id,
      tokenDigest: row.token_digest,
      signingKeyId: row.signing_key_id,
      generation: row.generation,
    };
  }
}
