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

interface DevelopmentParticipationDispatchInvitationRow {
  readonly invitation_generation: number | null;
  readonly invitation_id: string | null;
  readonly vote_id: string;
  readonly elector_id: string;
  readonly token_digest: string | null;
  readonly signing_key_id: string | null;
  readonly current_generation: number | null;
  readonly revoked_at: Date | null;
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

  async findDispatchInvitation(params: {
    readonly voteId: string;
    readonly smsDispatchId: string;
    readonly electorId: string;
  }): Promise<
    | {
        readonly invitationGeneration?: number;
        readonly currentInvitation?: DevelopmentParticipationInvitationReference;
      }
    | undefined
  > {
    const rows = await this.em
      .getConnection()
      .execute<DevelopmentParticipationDispatchInvitationRow[]>(
        `select sd.participation_invitation_generation as invitation_generation,
                pi.id as invitation_id,
                d.vote_id,
                sd.elector_id,
                pi.token_digest,
                pi.signing_key_id,
                pi.generation as current_generation,
                pi.revoked_at
           from sms_dispatches d
           join sms_deliveries sd on sd.dispatch_id = d.id
           left join participation_invitations pi
             on pi.vote_id = d.vote_id and pi.elector_id = sd.elector_id
          where d.id = ?
            and d.vote_id = ?
            and d.purpose = 'VOTE_PARTICIPATION_REMINDER'
            and sd.elector_id = ?
          limit 1`,
        [params.smsDispatchId, params.voteId, params.electorId],
        'all',
        this.em.getTransactionContext(),
      );
    const row = rows[0];
    if (!row) return undefined;
    const currentInvitation =
      row.invitation_id &&
      row.token_digest &&
      row.signing_key_id &&
      row.current_generation !== null &&
      row.revoked_at === null
        ? {
            id: row.invitation_id,
            voteId: row.vote_id,
            electorId: row.elector_id,
            tokenDigest: row.token_digest,
            signingKeyId: row.signing_key_id,
            generation: row.current_generation,
          }
        : undefined;
    return {
      ...(row.invitation_generation === null
        ? {}
        : { invitationGeneration: row.invitation_generation }),
      ...(currentInvitation ? { currentInvitation } : {}),
    };
  }
}
