export interface ElectoralRollMemberRecord {
  birthDate?: string;
  createdAt: string;
  electoralRollId: string;
  groupKey?: string;
  id: string;
  identifier: string;
  name?: string;
  phoneNumber?: string;
  updatedAt: string;
  voteWeight: number;
}

export interface ElectoralRollMemberDraft {
  birthDate?: string;
  draftId: string;
  groupKey?: string;
  identifier: string;
  name?: string;
  phoneNumber?: string;
  sourceMemberId?: string;
  voteWeight: number;
}

export type ElectoralRollMemberDraftField =
  | 'birthDate'
  | 'groupKey'
  | 'identifier'
  | 'name'
  | 'phoneNumber'
  | 'voteWeight';

export const ELECTORAL_ROLL_IDENTITY_REQUIRED_MESSAGE =
  '본인인증 투표에는 모든 선거인의 이름과 휴대폰번호가 필요합니다.';

export interface ElectoralRollRecord {
  createdAt: string;
  id: string;
  members: ElectoralRollMemberRecord[];
  name: string;
  revision: number;
  updatedAt: string;
}

export interface ElectoralRollPageItemRecord {
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
  page?: number;
  pageSize?: number;
  query?: string;
}

export interface CreateElectoralRollInput {
  name: string;
}

export interface CreateElectoralRollResult extends CreateElectoralRollInput {
  id: string;
  revision: number;
}

export interface DeleteElectoralRollInput {
  electoralRollId: string;
}

export interface AddElectoralRollMemberInput {
  birthDate?: string;
  electoralRollId: string;
  groupKey?: string;
  identifier: string;
  name?: string;
  phoneNumber?: string;
  voteWeight?: number;
}

export interface ElectoralRollImportMemberInput {
  birthDate?: string;
  groupKey?: string;
  identifier: string;
  name?: string;
  phoneNumber?: string;
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
  birthDate?: string;
  electoralRollId: string;
  groupKey?: string;
  identifier: string;
  memberId: string;
  name?: string;
  phoneNumber?: string;
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
