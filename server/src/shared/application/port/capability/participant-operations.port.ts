import type { ParticipationStatus } from '../../../domain/voting/type/participation-status.type';
import type { VotingChannel } from '../../../domain/voting/type/voting-channel.type';

export const ELECTOR_SIGNATURE_OPERATION_PORT = Symbol(
  'ELECTOR_SIGNATURE_OPERATION_PORT',
);

export interface AuthorizedElectorSignatureUploadRequest {
  readonly voteId: string;
  readonly electorId: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export interface AuthorizedElectorSignatureUploadConfirmation extends AuthorizedElectorSignatureUploadRequest {
  readonly storageKey: string;
  readonly checksum?: string;
}

export interface ElectorSignatureOperationPort {
  requestUpload(command: AuthorizedElectorSignatureUploadRequest): Promise<{
    readonly storageKey: string;
    readonly uploadUrl: string;
    readonly uploadHeaders: Readonly<Record<string, string>>;
    readonly expiresAt: Date;
  }>;
  confirmUpload(
    command: AuthorizedElectorSignatureUploadConfirmation,
    reauthorize?: () => Promise<void>,
  ): Promise<{ readonly fileId: string; readonly storageKey: string }>;
}

export const AUTHORIZED_PARTICIPATION_CAST_PORT = Symbol(
  'AUTHORIZED_PARTICIPATION_CAST_PORT',
);

export interface AuthorizedParticipationCastPort {
  cast(command: {
    readonly voteId: string;
    readonly electorId: string;
    readonly voteDetailId: string;
    readonly selectedCandidateId: string;
    readonly votingChannel: VotingChannel;
    readonly fieldVotingSessionId?: string;
    readonly participatedAt: Date;
  }): Promise<{
    readonly id: string;
    readonly voteDetailId: string;
    readonly status: ParticipationStatus;
  }>;
}
