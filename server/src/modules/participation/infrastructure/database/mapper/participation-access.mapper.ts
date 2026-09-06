import type { EntityRelationReference } from '../../../../../platform/database/mapper/mapper-relation.type';
import {
  ElectorParticipantSessionAggregate,
  type ParticipantSessionScope,
} from '../../../domain/access/elector-participant-session.aggregate';
import { ParticipationInvitationAggregate } from '../../../domain/access/participation-invitation.aggregate';

export interface ParticipationInvitationPersistence {
  readonly id: string;
  readonly vote: EntityRelationReference;
  readonly elector: EntityRelationReference;
  readonly tokenDigest: string;
  readonly expiresAt: Date | null;
  readonly generation: number;
  readonly claimedAt: Date | null;
  readonly claimedSessionId: string | null;
  readonly revokedAt: Date | null;
  readonly issuedByUserPrincipalId: string | null;
  readonly signingKeyId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ElectorParticipantSessionPersistence {
  readonly id: string;
  readonly tokenDigest: string;
  readonly csrfTokenDigest: string;
  readonly invitation: EntityRelationReference;
  readonly vote: EntityRelationReference;
  readonly elector: EntityRelationReference;
  readonly invitationGeneration: number;
  readonly scope: ParticipantSessionScope;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
  readonly lastUsedAt: Date;
}

export class ParticipationAccessMapper {
  static invitationToDomain(
    entity: ParticipationInvitationPersistence,
  ): ParticipationInvitationAggregate {
    if (!entity.issuedByUserPrincipalId || !entity.signingKeyId) {
      throw new Error('legacy participation invitation cannot be activated');
    }
    return ParticipationInvitationAggregate.reconstitute({
      id: entity.id,
      voteId: entity.vote.id,
      electorId: entity.elector.id,
      tokenDigest: entity.tokenDigest,
      signingKeyId: entity.signingKeyId,
      generation: entity.generation,
      claimedAt: entity.claimedAt ?? undefined,
      claimedSessionId: entity.claimedSessionId ?? undefined,
      revokedAt: entity.revokedAt ?? undefined,
      issuedByUserPrincipalId: entity.issuedByUserPrincipalId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static invitationToPersistence(
    invitation: ParticipationInvitationAggregate,
  ): ParticipationInvitationPersistence {
    return {
      id: invitation.id,
      vote: { id: invitation.voteId },
      elector: { id: invitation.electorId },
      tokenDigest: invitation.tokenDigest,
      expiresAt: null,
      generation: invitation.generation,
      claimedAt: invitation.claimedAt ?? null,
      claimedSessionId: invitation.claimedSessionId ?? null,
      revokedAt: invitation.revokedAt ?? null,
      issuedByUserPrincipalId: invitation.issuedByUserPrincipalId,
      signingKeyId: invitation.signingKeyId,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
  }

  static sessionToDomain(
    entity: ElectorParticipantSessionPersistence,
  ): ElectorParticipantSessionAggregate {
    return ElectorParticipantSessionAggregate.reconstitute({
      id: entity.id,
      tokenDigest: entity.tokenDigest,
      csrfTokenDigest: entity.csrfTokenDigest,
      invitationId: entity.invitation.id,
      voteId: entity.vote.id,
      electorId: entity.elector.id,
      invitationGeneration: entity.invitationGeneration,
      scope: entity.scope,
      expiresAt: entity.expiresAt,
      revokedAt: entity.revokedAt ?? undefined,
      createdAt: entity.createdAt,
      lastUsedAt: entity.lastUsedAt,
    });
  }

  static sessionToPersistence(
    session: ElectorParticipantSessionAggregate,
  ): ElectorParticipantSessionPersistence {
    return {
      id: session.id,
      tokenDigest: session.tokenDigest,
      csrfTokenDigest: session.csrfTokenDigest,
      invitation: { id: session.invitationId },
      vote: { id: session.voteId },
      elector: { id: session.electorId },
      invitationGeneration: session.invitationGeneration,
      scope: session.scope,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt ?? null,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
    };
  }
}
