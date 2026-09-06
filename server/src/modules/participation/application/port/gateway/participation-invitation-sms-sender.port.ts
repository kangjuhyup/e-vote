export const PARTICIPATION_INVITATION_SMS_SENDER_PORT = Symbol(
  'PARTICIPATION_INVITATION_SMS_SENDER_PORT',
);

export const PARTICIPATION_UI_URL = Symbol('PARTICIPATION_UI_URL');

export interface ParticipationInvitationSmsSenderPort {
  send(params: {
    readonly phoneNumber: string;
    readonly message: string;
    readonly idempotencyKey: string;
  }): Promise<void>;
}
