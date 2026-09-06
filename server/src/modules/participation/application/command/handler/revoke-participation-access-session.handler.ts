import { Inject, Injectable } from '@nestjs/common';
import {
  PARTICIPATION_ACCESS_REPOSITORY_PORT,
  type ParticipationAccessRepositoryPort,
} from '../../port/persistence/command/participation-access-repository.port';
import {
  PARTICIPATION_ACCESS_TOKEN_PORT,
  type ParticipationAccessTokenPort,
} from '../../port/security/participation-access-token.port';

@Injectable()
export class RevokeParticipationAccessSessionHandler {
  constructor(
    @Inject(PARTICIPATION_ACCESS_REPOSITORY_PORT)
    private readonly access: ParticipationAccessRepositoryPort,
    @Inject(PARTICIPATION_ACCESS_TOKEN_PORT)
    private readonly tokens: ParticipationAccessTokenPort,
  ) {}

  async execute(sessionToken: string, now = new Date()): Promise<void> {
    await this.access.revokeSessionByTokenDigest(
      this.tokens.digest(sessionToken),
      now,
    );
  }
}
