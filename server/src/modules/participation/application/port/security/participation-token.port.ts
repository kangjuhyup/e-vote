export const PARTICIPATION_TOKEN_PORT = Symbol('PARTICIPATION_TOKEN_PORT');

export interface ParticipationTokenPort {
  issue(): { readonly rawToken: string; readonly digest: string };
  digest(rawToken: string): string;
}
