import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTOR_PARTICIPANT_ACCESS_PORT,
  ElectorParticipantForbiddenError,
  type ElectorParticipantAccessPort,
} from '../../../../../shared/application/port/capability/elector-participant-access.port';
import {
  STORAGE_PORT,
  type StoragePort,
} from '../../../../../shared/application/port/gateway/storage.port';
import {
  assertElectorSignatureUploadMetadata,
  normalizeElectorSignatureMimeType,
} from '../elector-signature-upload.policy';
import { RequestElectorSignatureUploadCommand } from '../dto/request/request-elector-signature-upload.command';
import { RequestElectorSignatureUploadResult } from '../dto/response/request-elector-signature-upload-result.dto';

export const ELECTOR_SIGNATURE_UPLOAD_PURPOSE =
  'elector-participation-signature';

@Injectable()
export class RequestElectorSignatureUploadHandler {
  constructor(
    @Inject(STORAGE_PORT)
    private readonly storage: StoragePort,
    @Inject(ELECTOR_PARTICIPANT_ACCESS_PORT)
    private readonly participantAccess: ElectorParticipantAccessPort,
  ) {}

  async execute(
    command: RequestElectorSignatureUploadCommand,
  ): Promise<RequestElectorSignatureUploadResult> {
    assertElectorSignatureUploadMetadata(command);

    if (
      !(await this.participantAccess.isAuthorized(
        command.voteId,
        command.electorId,
        command.userPrincipalId,
      ))
    ) {
      throw new ElectorParticipantForbiddenError();
    }

    const presignedUrl = await this.storage.createPresignedPutObjectUrl({
      contentType: normalizeElectorSignatureMimeType(command.mimeType),
      contentLength: command.sizeBytes,
      metadata: {
        purpose: ELECTOR_SIGNATURE_UPLOAD_PURPOSE,
        voteid: command.voteId,
        electorid: command.electorId,
      },
    });

    return RequestElectorSignatureUploadResult.of({
      storageKey: presignedUrl.storageKey,
      uploadUrl: presignedUrl.url,
      expiresAt: presignedUrl.expiresAt,
    });
  }
}
