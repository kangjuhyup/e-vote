import { Inject, Injectable } from '@nestjs/common';
import {
  PARTICIPATION_INVITATION_REPOSITORY_PORT,
  type ParticipationInvitationRepositoryPort,
} from './port/persistence/command/participation-invitation-repository.port';
import {
  PARTICIPATION_TOKEN_PORT,
  type ParticipationTokenPort,
} from './port/security/participation-token.port';

export class ParticipationInvitationNotFoundError extends Error {
  constructor() {
    super('participation invitation not found');
  }
}

@Injectable()
export class ParticipationInvitationResolver {
  constructor(
    @Inject(PARTICIPATION_INVITATION_REPOSITORY_PORT)
    private readonly repository: ParticipationInvitationRepositoryPort,
    @Inject(PARTICIPATION_TOKEN_PORT)
    private readonly tokenService: ParticipationTokenPort,
  ) {}

  async resolve(rawToken: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) {
      throw new ParticipationInvitationNotFoundError();
    }
    const invitation = await this.repository.findByDigest(
      this.tokenService.digest(rawToken),
    );
    if (!invitation) {
      throw new ParticipationInvitationNotFoundError();
    }
    invitation.assertUsable(new Date());
    return invitation;
  }
}
