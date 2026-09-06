export class RequestElectorSignatureUploadCommand {
  private constructor(
    readonly voteId: string,
    readonly electorId: string,
    readonly userPrincipalId: string,
    readonly originalName: string,
    readonly mimeType: string,
    readonly sizeBytes: number,
  ) {}

  static of(params: {
    voteId: string;
    electorId: string;
    userPrincipalId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }): RequestElectorSignatureUploadCommand {
    return new RequestElectorSignatureUploadCommand(
      params.voteId,
      params.electorId,
      params.userPrincipalId,
      params.originalName,
      params.mimeType,
      params.sizeBytes,
    );
  }
}
