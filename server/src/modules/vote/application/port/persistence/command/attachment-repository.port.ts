export const ATTACHMENT_REPOSITORY_PORT = Symbol('ATTACHMENT_REPOSITORY_PORT');

export const AttachmentTargetType = {
  Vote: 'VOTE',
  VoteDetail: 'VOTE_DETAIL',
  Candidate: 'CANDIDATE',
} as const;

export type AttachmentTargetType =
  (typeof AttachmentTargetType)[keyof typeof AttachmentTargetType];

export const VoteAttachmentType = {
  Notice: 'NOTICE',
  Guide: 'GUIDE',
  Etc: 'ETC',
} as const;

export type VoteAttachmentType =
  (typeof VoteAttachmentType)[keyof typeof VoteAttachmentType];

export const VoteDetailAttachmentType = VoteAttachmentType;

export type VoteDetailAttachmentType = VoteAttachmentType;

export const CandidateAttachmentType = {
  ProfileImage: 'PROFILE_IMAGE',
  Pledge: 'PLEDGE',
  Poster: 'POSTER',
  Etc: 'ETC',
} as const;

export type CandidateAttachmentType =
  (typeof CandidateAttachmentType)[keyof typeof CandidateAttachmentType];

export type AttachmentType = VoteAttachmentType | CandidateAttachmentType;

export type AttachmentTarget =
  | {
      readonly targetType: typeof AttachmentTargetType.Vote;
      readonly voteId: string;
    }
  | {
      readonly targetType: typeof AttachmentTargetType.VoteDetail;
      readonly voteId: string;
      readonly voteDetailId: string;
    }
  | {
      readonly targetType: typeof AttachmentTargetType.Candidate;
      readonly voteId: string;
      readonly voteDetailId: string;
      readonly candidateId: string;
    };

export type UploadedAttachmentFile = {
  readonly storageKey: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksum?: string;
};

export type SaveAttachedFileParams = {
  readonly target: AttachmentTarget;
  readonly attachmentType: AttachmentType;
  readonly sortOrder: number;
  readonly file: UploadedAttachmentFile;
};

export type SaveAttachedFileResult = {
  readonly attachmentId: string;
  readonly fileId: string;
  readonly storageKey: string;
};

export interface AttachmentRepositoryPort {
  saveAttachedFile(
    params: SaveAttachedFileParams,
  ): Promise<SaveAttachedFileResult>;
}
