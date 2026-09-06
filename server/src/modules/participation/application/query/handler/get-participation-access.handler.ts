import { Inject, Injectable } from '@nestjs/common';
import {
  PARTICIPATION_ACCESS_READ_PORT,
  type ParticipationAccessReadPort,
} from '../../../../../shared/application/port/capability/participation-access-read.port';
import { ParticipationInvitationResolver } from '../../participation-invitation.resolver';

@Injectable()
export class GetParticipationAccessHandler {
  constructor(
    private readonly resolver: ParticipationInvitationResolver,
    @Inject(PARTICIPATION_ACCESS_READ_PORT)
    private readonly readRepository: ParticipationAccessReadPort,
  ) {}

  async execute(rawToken: string) {
    const invitation = await this.resolver.resolve(rawToken);
    const access = await this.readRepository.find(
      invitation.voteId,
      invitation.electorId,
    );
    if (!access) {
      throw new Error('participation invitation target not found');
    }
    return {
      ...access,
      expiresAt: invitation.expiresAt,
    };
  }
}
