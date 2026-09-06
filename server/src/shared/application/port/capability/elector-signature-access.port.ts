export const ELECTOR_SIGNATURE_ACCESS_PORT = Symbol(
  'ELECTOR_SIGNATURE_ACCESS_PORT',
);

export interface ElectorSignatureAccessPort {
  hasConfirmedSignature(voteId: string, electorId: string): Promise<boolean>;
}
