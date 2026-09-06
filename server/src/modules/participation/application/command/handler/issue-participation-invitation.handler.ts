import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTOR_ACCESS_PORT,
  type ElectorAccessPort,
} from '../../../../../shared/application/port/capability/elector-access.port';
import { ElectorNotFoundError } from './cast-participation.handler';
import { ParticipationInvitationAggregate } from '../../../domain/participation-invitation.aggregate';
import {
  PARTICIPATION_INVITATION_REPOSITORY_PORT,
  type ParticipationInvitationRepositoryPort,
} from '../../port/persistence/command/participation-invitation-repository.port';
import {
  PARTICIPATION_TOKEN_PORT,
  type ParticipationTokenPort,
} from '../../port/security/participation-token.port';
import type { ParticipationInvitationIssuerPort } from '../../../../../shared/application/port/capability/participation-invitation-issuer.port';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class IssueParticipationInvitationHandler implements ParticipationInvitationIssuerPort {
  constructor(
    @Inject(ELECTOR_ACCESS_PORT)
    private readonly electors: ElectorAccessPort,
    @Inject(PARTICIPATION_INVITATION_REPOSITORY_PORT)
    private readonly invitations: ParticipationInvitationRepositoryPort,
    @Inject(PARTICIPATION_TOKEN_PORT)
    private readonly tokens: ParticipationTokenPort,
  ) {}

  async execute(voteId: string, electorId: string) {
    const elector = await this.electors.findById(voteId, electorId);
    if (!elector) throw new ElectorNotFoundError();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS);
    const credential = this.tokens.issue();
    const existing = await this.invitations.findByElector(voteId, electorId);
    const invitation =
      existing ??
      ParticipationInvitationAggregate.create({
        id: this.invitations.nextId(),
        voteId,
        electorId,
        tokenDigest: credential.digest,
        expiresAt,
        now,
      });
    if (existing) existing.rotate(credential.digest, expiresAt, now);
    await this.invitations.save(invitation);
    return {
      invitationId: invitation.id,
      rawToken: credential.rawToken,
      expiresAt,
    };
  }

  issue(voteId: string, electorId: string) {
    return this.execute(voteId, electorId);
  }
}
