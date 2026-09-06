import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTOR_SIGNATURE_OPERATION_PORT,
  type AuthorizedElectorSignatureUploadConfirmation,
  type AuthorizedElectorSignatureUploadRequest,
  type ElectorSignatureOperationPort,
} from '../../../../../shared/application/port/capability/participant-operations.port';
import { ResolveParticipationAccessSessionHandler } from '../../query/handler/resolve-participation-access-session.handler';
import { ParticipantSessionScope } from '../../../domain/access/elector-participant-session.aggregate';

interface ParticipantSignatureRequest {
  readonly sessionToken: string;
  readonly csrfToken: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

@Injectable()
export class ParticipantSignatureUploadHandler {
  constructor(
    private readonly sessions: ResolveParticipationAccessSessionHandler,
    @Inject(ELECTOR_SIGNATURE_OPERATION_PORT)
    private readonly signatures: ElectorSignatureOperationPort,
  ) {}

  async requestUpload(
    command: ParticipantSignatureRequest,
  ): ReturnType<ElectorSignatureOperationPort['requestUpload']> {
    const session = await this.resolve(command);
    return this.signatures.requestUpload(
      this.authorizedRequest(command, session),
    );
  }

  async confirmUpload(
    command: ParticipantSignatureRequest & {
      readonly storageKey: string;
      readonly checksum?: string;
    },
  ): ReturnType<ElectorSignatureOperationPort['confirmUpload']> {
    const session = await this.resolve(command);
    const confirmation: AuthorizedElectorSignatureUploadConfirmation = {
      ...this.authorizedRequest(command, session),
      storageKey: command.storageKey,
      ...(command.checksum ? { checksum: command.checksum } : {}),
    };
    return this.signatures.confirmUpload(confirmation, async () => {
      await this.resolve(command);
    });
  }

  private resolve(command: ParticipantSignatureRequest) {
    return this.sessions.execute({
      sessionToken: command.sessionToken,
      csrfToken: command.csrfToken,
      expectedScope: ParticipantSessionScope.Participate,
      requireCsrf: true,
    });
  }

  private authorizedRequest(
    command: ParticipantSignatureRequest,
    session: { readonly voteId: string; readonly electorId: string },
  ): AuthorizedElectorSignatureUploadRequest {
    return {
      voteId: session.voteId,
      electorId: session.electorId,
      originalName: command.originalName,
      mimeType: command.mimeType,
      sizeBytes: command.sizeBytes,
    };
  }
}
