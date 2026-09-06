import type { ParticipationInvitationAggregate } from '../../../../domain/participation-invitation.aggregate';

export const PARTICIPATION_INVITATION_REPOSITORY_PORT = Symbol(
  'PARTICIPATION_INVITATION_REPOSITORY_PORT',
);

export interface ParticipationInvitationRepositoryPort {
  nextId(): string;
  findByDigest(
    digest: string,
  ): Promise<ParticipationInvitationAggregate | undefined>;
  findByElector(
    voteId: string,
    electorId: string,
  ): Promise<ParticipationInvitationAggregate | undefined>;
  save(invitation: ParticipationInvitationAggregate): Promise<void>;
}
