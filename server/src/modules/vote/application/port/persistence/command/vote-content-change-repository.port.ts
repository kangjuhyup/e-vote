import type {
  VoteContentChangeProposal,
  VoteContentChangeStatus,
} from '../../../../domain/vote/vote-content-change.policy';

export const VOTE_CONTENT_CHANGE_REPOSITORY_PORT = Symbol(
  'VOTE_CONTENT_CHANGE_REPOSITORY_PORT',
);

export type VoteContentChangeFileKind =
  'DOCUMENT' | 'VOTE_ATTACHMENT' | 'CANDIDATE_ATTACHMENT';

export type VoteContentChangeFile = {
  id: string;
  voteId: string;
  ownerUserPrincipalId: string;
  kind: VoteContentChangeFileKind;
  candidateId?: string;
  attachmentType?: string;
  sortOrder?: number;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksum?: string;
  confirmedAt?: Date;
  requestId?: string;
};

export type VoteContentChangeRequest = {
  id: string;
  voteId: string;
  tenantId: string;
  submittedByUserPrincipalId: string;
  status: VoteContentChangeStatus;
  reason: string;
  documentFileId: string;
  proposal: VoteContentChangeProposal;
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
  files?: Array<
    Pick<
      VoteContentChangeFile,
      | 'id'
      | 'kind'
      | 'candidateId'
      | 'attachmentType'
      | 'originalName'
      | 'mimeType'
      | 'sizeBytes'
    >
  >;
  submittedAt: Date;
  reviewedByUserPrincipalId?: string;
  reviewedAt?: Date;
  reviewReason?: string;
};

export interface VoteContentChangeRepositoryPort {
  findVote(voteId: string): Promise<
    | {
        id: string;
        tenantId?: string;
        createdByUserPrincipalId?: string;
        status: string;
        startedAt: Date;
        endedAt: Date;
        title: string;
        description: string;
      }
    | undefined
  >;
  stageFile(file: VoteContentChangeFile): Promise<void>;
  findFile(fileId: string): Promise<VoteContentChangeFile | undefined>;
  confirmFile(fileId: string, checksum?: string): Promise<void>;
  submit(input: {
    voteId: string;
    tenantId: string;
    userPrincipalId: string;
    reason: string;
    documentFileId: string;
    proposal: VoteContentChangeProposal;
    submittedAt: Date;
  }): Promise<VoteContentChangeRequest>;
  findRequest(requestId: string): Promise<VoteContentChangeRequest | undefined>;
  listByVote(voteId: string): Promise<VoteContentChangeRequest[]>;
  listByTenant(tenantId: string): Promise<VoteContentChangeRequest[]>;
  review(input: {
    requestId: string;
    tenantId: string;
    reviewerId: string;
    decision: 'APPROVED' | 'REJECTED';
    reason?: string;
    reviewedAt: Date;
  }): Promise<VoteContentChangeRequest>;
}
