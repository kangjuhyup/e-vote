import type { ElectorSignatureAccessPort } from '../../../../../../shared/application/port/capability/elector-signature-access.port';

export const ELECTOR_SIGNATURE_REPOSITORY_PORT = Symbol(
  'ELECTOR_SIGNATURE_REPOSITORY_PORT',
);

export type SaveElectorSignatureParams = {
  readonly voteId: string;
  readonly electorId: string;
  readonly file: {
    readonly storageKey: string;
    readonly originalName: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
    readonly checksum?: string;
  };
};

export type SaveElectorSignatureResult = {
  readonly fileId: string;
  readonly storageKey: string;
};

export interface ElectorSignatureRepositoryPort extends ElectorSignatureAccessPort {
  save(params: SaveElectorSignatureParams): Promise<SaveElectorSignatureResult>;
}
