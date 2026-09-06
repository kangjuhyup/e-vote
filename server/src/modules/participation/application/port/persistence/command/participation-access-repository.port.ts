import type { ElectorParticipantSessionAggregate } from '../../../../domain/access/elector-participant-session.aggregate';
import type { ParticipationInvitationAggregate } from '../../../../domain/access/participation-invitation.aggregate';
import type { ParticipationAccessRevocationPort } from '../../../../../../shared/application/port/capability/participation-access-revocation.port';

export const PARTICIPATION_ACCESS_REPOSITORY_PORT = Symbol(
  'PARTICIPATION_ACCESS_REPOSITORY_PORT',
);

export type ParticipationInvitationDeliveryStatus =
  'PENDING' | 'PROCESSING' | 'SENT' | 'SKIPPED' | 'DEAD';

export interface ClaimedParticipationInvitationDelivery {
  readonly id: string;
  readonly invitationId: string;
  readonly invitationGeneration: number;
  readonly lockToken: string;
  readonly attemptCount: number;
}

export interface ParticipationAccessRepositoryPort extends ParticipationAccessRevocationPort {
  nextId(): string;
  findInvitationByElectorForUpdate(
    voteId: string,
    electorId: string,
  ): Promise<ParticipationInvitationAggregate | undefined>;
  findInvitationsByElectorsForUpdate(
    voteId: string,
    electorIds: readonly string[],
  ): Promise<readonly ParticipationInvitationAggregate[]>;
  findInvitationByIdForUpdate(
    invitationId: string,
  ): Promise<ParticipationInvitationAggregate | undefined>;
  findInvitationById(
    invitationId: string,
  ): Promise<ParticipationInvitationAggregate | undefined>;
  saveInvitation(invitation: ParticipationInvitationAggregate): Promise<void>;
  saveInvitations(
    invitations: readonly ParticipationInvitationAggregate[],
  ): Promise<void>;
  findSessionByTokenDigest(
    tokenDigest: string,
  ): Promise<ElectorParticipantSessionAggregate | undefined>;
  findSessionById(
    sessionId: string,
  ): Promise<ElectorParticipantSessionAggregate | undefined>;
  saveSession(session: ElectorParticipantSessionAggregate): Promise<void>;
  revokeSessionsForInvitation(invitationId: string, now: Date): Promise<void>;
  revokeSessionsForInvitations(
    invitationIds: readonly string[],
    now: Date,
  ): Promise<void>;
  revokeSessionByTokenDigest(tokenDigest: string, now: Date): Promise<void>;
  revokeAccessForVote(voteId: string, now: Date): Promise<void>;
  revokeAccessForElector(electorId: string, now: Date): Promise<void>;
  enqueueDelivery(params: {
    readonly id: string;
    readonly invitationId: string;
    readonly invitationGeneration: number;
    readonly status: ParticipationInvitationDeliveryStatus;
    readonly now: Date;
  }): Promise<void>;
  enqueueDeliveries(
    deliveries: ReadonlyArray<{
      readonly id: string;
      readonly invitationId: string;
      readonly invitationGeneration: number;
      readonly status: ParticipationInvitationDeliveryStatus;
      readonly now: Date;
    }>,
  ): Promise<void>;
  claimDeliveryBatch(params: {
    readonly workerId: string;
    readonly batchSize: number;
    readonly leaseDurationMs: number;
  }): Promise<readonly ClaimedParticipationInvitationDelivery[]>;
  markDeliverySent(params: {
    readonly id: string;
    readonly lockToken: string;
    readonly now: Date;
  }): Promise<boolean>;
  markDeliverySkipped(params: {
    readonly id: string;
    readonly lockToken: string;
    readonly reason: string;
    readonly now: Date;
  }): Promise<boolean>;
  rescheduleDelivery(params: {
    readonly id: string;
    readonly lockToken: string;
    readonly availableAt: Date;
    readonly errorMessage: string;
    readonly now: Date;
  }): Promise<boolean>;
  markDeliveryDead(params: {
    readonly id: string;
    readonly lockToken: string;
    readonly errorMessage: string;
    readonly now: Date;
  }): Promise<boolean>;
}
