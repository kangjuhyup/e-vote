export const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

export type AllowedAttachmentMimeType =
  (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];

export type VoteAttachmentType = 'NOTICE' | 'GUIDE' | 'ETC';
export type CandidateAttachmentType =
  | 'PROFILE_IMAGE'
  | 'PLEDGE'
  | 'POSTER'
  | 'ETC';
export type AttachmentType = VoteAttachmentType | CandidateAttachmentType;

export interface AttachmentUploadMetadata<TType extends AttachmentType> {
  attachmentType: TType;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  sortOrder?: number;
}

export interface AttachmentUploadGrant<TType extends AttachmentType> {
  expiresAt: string;
  metadata: AttachmentUploadMetadata<TType>;
  storageKey: string;
  uploadUrl: string;
}

export interface ConfirmAttachmentUploadInput<
  TType extends AttachmentType,
> extends AttachmentUploadMetadata<TType> {
  checksum?: string;
  storageKey: string;
}

export interface ConfirmedAttachmentUpload<TType extends AttachmentType> {
  attachmentId: string;
  attachmentType: TType;
  fileId: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  storageKey: string;
}

export interface AttachmentUploadResult {
  attachmentId: string;
  fileId: string;
  storageKey: string;
}

export interface VoteAttachmentTarget {
  voteId: string;
}

export interface CandidateAttachmentTarget extends VoteAttachmentTarget {
  candidateId: string;
  voteDetailId: string;
}
