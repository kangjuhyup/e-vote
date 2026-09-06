import { Inject, Injectable } from '@nestjs/common';
import {
  PARTICIPATION_INVITATION_RECIPIENT_ACCESS_PORT,
  type ParticipationInvitationRecipientAccessPort,
} from '../../port/capability/participation-invitation-recipient-access.port';
import {
  PARTICIPATION_INVITATION_SMS_SENDER_PORT,
  PARTICIPATION_UI_URL,
  type ParticipationInvitationSmsSenderPort,
} from '../../port/gateway/participation-invitation-sms-sender.port';
import {
  PARTICIPATION_ACCESS_REPOSITORY_PORT,
  type ClaimedParticipationInvitationDelivery,
  type ParticipationAccessRepositoryPort,
} from '../../port/persistence/command/participation-access-repository.port';
import {
  PARTICIPATION_ACCESS_TOKEN_PORT,
  type ParticipationAccessTokenPort,
} from '../../port/security/participation-access-token.port';

@Injectable()
export class ProcessParticipationInvitationDeliveryHandler {
  constructor(
    @Inject(PARTICIPATION_ACCESS_REPOSITORY_PORT)
    private readonly access: ParticipationAccessRepositoryPort,
    @Inject(PARTICIPATION_INVITATION_RECIPIENT_ACCESS_PORT)
    private readonly recipients: ParticipationInvitationRecipientAccessPort,
    @Inject(PARTICIPATION_ACCESS_TOKEN_PORT)
    private readonly tokens: ParticipationAccessTokenPort,
    @Inject(PARTICIPATION_INVITATION_SMS_SENDER_PORT)
    private readonly sender: ParticipationInvitationSmsSenderPort,
    @Inject(PARTICIPATION_UI_URL)
    private readonly participationUiUrl: string,
  ) {}

  async execute(
    delivery: ClaimedParticipationInvitationDelivery,
    now = new Date(),
  ): Promise<void> {
    const invitation = await this.access.findInvitationById(
      delivery.invitationId,
    );
    if (
      !invitation ||
      invitation.revokedAt ||
      invitation.generation !== delivery.invitationGeneration
    ) {
      await this.access.markDeliverySkipped({
        id: delivery.id,
        lockToken: delivery.lockToken,
        reason: 'STALE_GENERATION',
        now,
      });
      return;
    }

    const phoneNumber = await this.recipients.findPhoneNumber(
      invitation.voteId,
      invitation.electorId,
    );
    if (!phoneNumber) {
      await this.access.markDeliverySkipped({
        id: delivery.id,
        lockToken: delivery.lockToken,
        reason: 'NO_PHONE_NUMBER',
        now,
      });
      return;
    }

    const reference = this.tokens.issueReference(
      invitation.id,
      invitation.generation,
    );
    if (
      reference.tokenDigest !== invitation.tokenDigest ||
      reference.keyId !== invitation.signingKeyId
    ) {
      await this.access.markDeliverySkipped({
        id: delivery.id,
        lockToken: delivery.lockToken,
        reason: 'SIGNING_KEY_MISMATCH',
        now,
      });
      return;
    }

    const linkBase = this.participationUiUrl
      .replace(/#.*$/, '')
      .replace(/\/$/, '');
    await this.sender.send({
      phoneNumber,
      message: `투표 참여 링크: ${linkBase}#access_token=${reference.token}`,
      idempotencyKey: `participation-invitation:${invitation.id}:${invitation.generation}`,
    });
    await this.access.markDeliverySent({
      id: delivery.id,
      lockToken: delivery.lockToken,
      now,
    });
  }
}
