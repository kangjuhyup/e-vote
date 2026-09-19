export type VoteContentChangeStatus =
  | 'PENDING' | 'APPROVED' | 'REJECTED' | 'INVALIDATED';

export type VoteContentChangeFileKind =
  | 'DOCUMENT' | 'VOTE_ATTACHMENT' | 'CANDIDATE_ATTACHMENT';

export type VoteContentAttachmentChange =
  | { action: 'ADD'; fileId: string }
  | { action: 'REMOVE'; attachmentId: string };

export interface VoteContentChangeFile {
  id: string;
  kind: VoteContentChangeFileKind;
  candidateId?: string;
  attachmentType?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface VoteContentChangeRequest {
  id: string;
  voteId: string;
  tenantId: string;
  submittedByUserPrincipalId: string;
  status: VoteContentChangeStatus;
  reason: string;
  documentFileId: string;
  proposal: {
    title?: string;
    description?: string;
    endedAt?: string;
    attachmentChanges: VoteContentAttachmentChange[];
  };
  snapshot: {
    title: string;
    description: string;
    endedAt: string;
    attachments: Array<{
      id: string;
      kind: 'VOTE_ATTACHMENT' | 'CANDIDATE_ATTACHMENT';
      candidateId?: string;
      fileName: string;
      attachmentType: string;
    }>;
  };
  files: VoteContentChangeFile[];
  submittedAt: string;
  reviewedByUserPrincipalId?: string;
  reviewedAt?: string;
  reviewReason?: string;
}

export interface VoteContentChangeUploadGrant {
  fileId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  expiresAt: string;
}
