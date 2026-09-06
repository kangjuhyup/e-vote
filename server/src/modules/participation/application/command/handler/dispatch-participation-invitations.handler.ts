import { Inject, Injectable } from '@nestjs/common';
import { VoteStatus } from '../../../../../shared/domain/voting/type/vote-status.type';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import {
  VOTE_ACCESS_PORT,
  type VoteAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import { ParticipationInvitationAggregate } from '../../../domain/access/participation-invitation.aggregate';
import { DispatchParticipationInvitationsCommand } from '../dto/request/dispatch-participation-invitations.command';
import { DispatchParticipationInvitationsResult } from '../dto/response/dispatch-participation-invitations-result.dto';
import {
  ParticipationInvitationAccessDeniedError,
  ParticipationInvitationIdentityPolicyError,
  ParticipationInvitationStateError,
  ParticipationInvitationVoteNotFoundError,
} from '../participation-invitation.error';
import {
  PARTICIPATION_INVITATION_RECIPIENT_ACCESS_PORT,
  type ParticipationInvitationRecipientAccessPort,
} from '../../port/capability/participation-invitation-recipient-access.port';
import {
  PARTICIPATION_ACCESS_REPOSITORY_PORT,
  type ParticipationAccessRepositoryPort,
} from '../../port/persistence/command/participation-access-repository.port';
import {
  PARTICIPATION_ACCESS_TOKEN_PORT,
  type ParticipationAccessTokenPort,
} from '../../port/security/participation-access-token.port';

const INVITATION_ALLOWED_STATUSES = new Set<
  (typeof VoteStatus)[keyof typeof VoteStatus]
>([VoteStatus.Finalized, VoteStatus.Open, VoteStatus.Closed]);

@Injectable()
export class DispatchParticipationInvitationsHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_ACCESS_PORT) private readonly votes: VoteAccessPort,
    @Inject(PARTICIPATION_INVITATION_RECIPIENT_ACCESS_PORT)
    private readonly recipients: ParticipationInvitationRecipientAccessPort,
    @Inject(PARTICIPATION_ACCESS_REPOSITORY_PORT)
    private readonly access: ParticipationAccessRepositoryPort,
    @Inject(PARTICIPATION_ACCESS_TOKEN_PORT)
    private readonly tokens: ParticipationAccessTokenPort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: DispatchParticipationInvitationsCommand,
  ): Promise<DispatchParticipationInvitationsResult> {
    const vote = await this.votes.findById(command.voteId);
    if (!vote) throw new ParticipationInvitationVoteNotFoundError();
    if (!vote.isCreatedBy(command.requestedByUserPrincipalId)) {
      throw new ParticipationInvitationAccessDeniedError();
    }
    if (vote.identityVerificationPolicy.required) {
      throw new ParticipationInvitationIdentityPolicyError();
    }
    if (!INVITATION_ALLOWED_STATUSES.has(vote.status)) {
      throw new ParticipationInvitationStateError();
    }

    const recipients = await this.recipients.findEligibleRecipients({
      voteId: vote.id,
      ...(command.electorIds ? { electorIds: command.electorIds } : {}),
    });
    const deliverable = recipients.filter(
      (recipient) => recipient.hasPhoneNumber,
    );
    const existingInvitations =
      await this.access.findInvitationsByElectorsForUpdate(
        vote.id,
        deliverable.map((recipient) => recipient.electorId),
      );
    const existingByElector = new Map(
      existingInvitations.map((invitation) => [
        invitation.electorId,
        invitation,
      ]),
    );
    const now = new Date();
    const invitations: ParticipationInvitationAggregate[] = [];
    const deliveries: Array<
      Parameters<ParticipationAccessRepositoryPort['enqueueDelivery']>[0]
    > = [];
    const rotatedInvitationIds: string[] = [];

    for (const recipient of deliverable) {
      const existing = existingByElector.get(recipient.electorId);
      const invitationId = existing?.id ?? this.access.nextId();
      const generation = (existing?.generation ?? 0) + 1;
      const issued = this.tokens.issueReference(invitationId, generation);
      const invitation =
        existing ??
        ParticipationInvitationAggregate.issue({
          id: invitationId,
          voteId: vote.id,
          electorId: recipient.electorId,
          tokenDigest: issued.tokenDigest,
          signingKeyId: issued.keyId,
          issuedByUserPrincipalId: command.requestedByUserPrincipalId,
          now,
        });

      if (existing) {
        invitation.rotate({
          tokenDigest: issued.tokenDigest,
          signingKeyId: issued.keyId,
          issuedByUserPrincipalId: command.requestedByUserPrincipalId,
          now,
        });
        rotatedInvitationIds.push(invitation.id);
      }
      invitations.push(invitation);
      deliveries.push({
        id: this.access.nextId(),
        invitationId: invitation.id,
        invitationGeneration: invitation.generation,
        status: 'PENDING',
        now,
      });
    }

    await this.access.revokeSessionsForInvitations(rotatedInvitationIds, now);
    await this.access.saveInvitations(invitations);
    await this.access.enqueueDeliveries(deliveries);

    return DispatchParticipationInvitationsResult.of({
      totalCount: recipients.length,
      queuedCount: deliverable.length,
      skippedCount: recipients.length - deliverable.length,
    });
  }
}
