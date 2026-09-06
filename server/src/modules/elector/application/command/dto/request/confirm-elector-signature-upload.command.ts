export class ConfirmElectorSignatureUploadCommand {
  private constructor(
    readonly voteId: string,
    readonly electorId: string,
    readonly userPrincipalId: string,
    readonly storageKey: string,
    readonly originalName: string,
    readonly mimeType: string,
    readonly sizeBytes: number,
    readonly checksum?: string,
  ) {}

  static of(params: {
    voteId: string;
    electorId: string;
    userPrincipalId: string;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    checksum?: string;
  }): ConfirmElectorSignatureUploadCommand {
    return new ConfirmElectorSignatureUploadCommand(
      params.voteId,
      params.electorId,
      params.userPrincipalId,
      params.storageKey,
      params.originalName,
      params.mimeType,
      params.sizeBytes,
      params.checksum,
    );
  }
}
