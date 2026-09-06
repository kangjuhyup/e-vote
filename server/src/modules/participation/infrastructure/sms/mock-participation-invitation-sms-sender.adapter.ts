import type { ParticipationInvitationSmsSenderPort } from '../../application/port/gateway/participation-invitation-sms-sender.port';

const SUCCESS_RATE = 0.9;

export class MockParticipationInvitationSmsSenderAdapter implements ParticipationInvitationSmsSenderPort {
  constructor(private readonly random: () => number = Math.random) {}

  send(): Promise<void> {
    if (this.random() >= SUCCESS_RATE) {
      return Promise.reject(new Error('mock invitation SMS delivery failed'));
    }

    return Promise.resolve();
  }
}
