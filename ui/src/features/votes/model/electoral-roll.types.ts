export interface ElectoralRollMemberRecord {
  createdAt: string;
  electoralRollId: string;
  groupKey?: string;
  id: string;
  identifier: string;
  updatedAt: string;
  voteWeight: number;
}

export interface ElectoralRollMemberDraft {
  draftId: string;
  groupKey?: string;
  identifier: string;
  sourceMemberId?: string;
  voteWeight: number;
}

export type ElectoralRollMemberDraftField =
  | "groupKey"
  | "identifier"
  | "voteWeight";

export interface ElectoralRollRecord {
  commissionId: string;
  createdAt: string;
  id: string;
  members: ElectoralRollMemberRecord[];
  name: string;
  revision: number;
  updatedAt: string;
}

export interface ElectoralRollPageItemRecord {
  commissionId: string;
  id: string;
  memberCount: number;
  name: string;
  revision: number;
  updatedAt: string;
}

export interface ElectoralRollPageRecord {
  items: ElectoralRollPageItemRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ElectoralRollPageInput {
  commissionId?: string;
  page?: number;
  pageSize?: number;
  query?: string;
}

export interface CreateElectoralRollInput {
  commissionId: string;
  name: string;
}

export interface CreateElectoralRollResult extends CreateElectoralRollInput {
  id: string;
  revision: number;
}

export interface AddElectoralRollMemberInput {
  electoralRollId: string;
  groupKey?: string;
  identifier: string;
  voteWeight?: number;
}

export interface ElectoralRollImportMemberInput {
  groupKey?: string;
  identifier: string;
  rowNumber: number;
  voteWeight: number;
}

export interface AddElectoralRollMembersInput {
  electoralRollId: string;
  members: readonly ElectoralRollImportMemberInput[];
}

export interface AddElectoralRollMembersResult {
  addedMemberCount: number;
  electoralRollId: string;
  revision: number;
}

export interface StageElectoralRollMembersResult {
  stagedMemberCount: number;
}

export interface ElectoralRollWorkbookError {
  message: string;
  rowNumber?: number;
}

export interface ElectoralRollWorkbookParseResult {
  errors: ElectoralRollWorkbookError[];
  members: ElectoralRollImportMemberInput[];
}

export interface UpdateElectoralRollMemberInput {
  electoralRollId: string;
  groupKey?: string;
  identifier: string;
  memberId: string;
  voteWeight: number;
}

export interface RemoveElectoralRollMemberInput {
  electoralRollId: string;
  memberId: string;
}

export interface ManageElectoralRollMemberResult {
  electoralRollId: string;
  groupKey?: string;
  id: string;
  identifier: string;
  revision: number;
  voteWeight: number;
}

export interface RemoveElectoralRollMemberResult {
  electoralRollId: string;
  memberId: string;
  revision: number;
}
