import { Inject, Injectable } from '@nestjs/common';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import {
  SMS_RECIPIENT_ACCESS_PORT,
  type SmsRecipientAccessPort,
} from '../../../../../shared/application/port/capability/sms-recipient-access.port';
import type {
  ParticipationReminderLinkIssuerPort,
  ParticipationReminderLinkReference,
} from '../../../../../shared/application/port/capability/participation-reminder-link-issuer.port';
import { ElectorStatus } from '../../../../../shared/domain/voting/type/elector-status.type';
import { ParticipationInvitationAggregate } from '../../../domain/access/participation-invitation.aggregate';
import {
  PARTICIPATION_ACCESS_REPOSITORY_PORT,
  type ParticipationAccessRepositoryPort,
} from '../../port/persistence/command/participation-access-repository.port';
import {
  PARTICIPATION_ACCESS_TOKEN_PORT,
  type ParticipationAccessTokenPort,
} from '../../port/security/participation-access-token.port';
import { PARTICIPATION_UI_URL } from '../../port/gateway/participation-invitation-sms-sender.port';

const ELECTOR_PAGE_SIZE = 100;

@Injectable()
export class IssueParticipationReminderLinksHandler implements ParticipationReminderLinkIssuerPort {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(SMS_RECIPIENT_ACCESS_PORT)
    private readonly recipients: SmsRecipientAccessPort,
    @Inject(PARTICIPATION_ACCESS_REPOSITORY_PORT)
    private readonly access: ParticipationAccessRepositoryPort,
    @Inject(PARTICIPATION_ACCESS_TOKEN_PORT)
    private readonly tokens: ParticipationAccessTokenPort,
    @Inject(PARTICIPATION_UI_URL)
    private readonly participationUiUrl: string,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async issueForNonParticipants(params: {
    readonly voteId: string;
    readonly issuedByUserPrincipalId: string;
  }): Promise<readonly ParticipationReminderLinkReference[]> {
    const electorIds = await this.findEligibleNonParticipantIds(params.voteId);
    const existingInvitations =
      await this.access.findInvitationsByElectorsForUpdate(
        params.voteId,
        electorIds,
      );
    const existingByElector = new Map(
      existingInvitations.map((invitation) => [
        invitation.electorId,
        invitation,
      ]),
    );
    const now = new Date();
    const invitations: ParticipationInvitationAggregate[] = [];
    const rotatedInvitationIds: string[] = [];
    const links: ParticipationReminderLinkReference[] = [];
    const linkBase = this.participationUiUrl
      .replace(/#.*$/, '')
      .replace(/\/$/, '');

    for (const electorId of electorIds) {
      const existing = existingByElector.get(electorId);
      const invitationId = existing?.id ?? this.access.nextId();
      const generation = (existing?.generation ?? 0) + 1;
      const issued = this.tokens.issueReference(invitationId, generation);
      const invitation =
        existing ??
        ParticipationInvitationAggregate.issue({
          id: invitationId,
          voteId: params.voteId,
          electorId,
          tokenDigest: issued.tokenDigest,
          signingKeyId: issued.keyId,
          issuedByUserPrincipalId: params.issuedByUserPrincipalId,
          now,
        });
      if (existing) {
        invitation.rotate({
          tokenDigest: issued.tokenDigest,
          signingKeyId: issued.keyId,
          issuedByUserPrincipalId: params.issuedByUserPrincipalId,
          now,
        });
        rotatedInvitationIds.push(invitation.id);
      }
      invitations.push(invitation);
      links.push({
        electorId,
        invitationGeneration: generation,
        participationUrl: `${linkBase}#access_token=${issued.token}`,
      });
    }

    await this.access.revokeSessionsForInvitations(rotatedInvitationIds, now);
    await this.access.saveInvitations(invitations);
    return links;
  }

  private async findEligibleNonParticipantIds(
    voteId: string,
  ): Promise<string[]> {
    const electorIds: string[] = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const result = await this.recipients.findPage({
        voteId,
        page,
        pageSize: ELECTOR_PAGE_SIZE,
      });
      electorIds.push(
        ...result.items
          .filter(
            (recipient) =>
              recipient.status === ElectorStatus.Eligible &&
              !recipient.participated,
          )
          .map((recipient) => recipient.electorId),
      );
      totalPages = result.totalPages;
      page += 1;
    }
    return [...new Set(electorIds)];
  }
}
