export type PrivacyMode = 'SECRET' | 'PUBLIC';
export type ParticipationUnit = 'INDIVIDUAL' | 'GROUP';
export type ResultStorageMode = 'DATABASE' | 'BLOCKCHAIN';
export type VoteWeightMode = 'EQUAL' | 'SHARE';
export type VoteStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELED';
export type VotingChannel = 'ONLINE' | 'ONSITE' | 'VISIT';
export type VoteDetailType = 'CANDIDATE' | 'YES_NO';
export type ElectionCommissionStatus = 'ACTIVE' | 'SUSPENDED';
export type ElectionCommissionMemberRole = 'ADMIN' | 'FIELD_MANAGER';
export type ElectionCommissionMemberStatus = 'ACTIVE' | 'INACTIVE';
export type FieldVotingSessionStatus =
  'SCHEDULED' | 'OPEN' | 'CLOSED' | 'CANCELED';
export type ElectorStatus = 'ELIGIBLE' | 'BLOCKED';
export type CandidateStatus = 'ACTIVE' | 'WITHDRAWN';
export type ParticipationStatus = 'CAST' | 'CANCELED';
export type FileStatus = 'ACTIVE' | 'DELETED';
export type VoteAttachmentType = 'NOTICE' | 'GUIDE' | 'ETC';
export type ElectorAttachmentType = 'SIGNATURE' | 'ETC';
export type CandidateAttachmentType =
  'PROFILE_IMAGE' | 'PLEDGE' | 'POSTER' | 'ETC';
export type IdentityVerificationProvider =
  'PASS' | 'KAKAO_CERT' | 'NAVER_CERT' | 'TOSS_CERT' | 'SMS' | 'ETC';
export type IdentityVerificationMethod =
  'MOBILE' | 'CERTIFICATE' | 'SMS' | 'EMAIL' | 'ADMIN';
export type IdentityVerificationStatus = 'SUCCESS' | 'FAILED' | 'CANCELED';
export type ContentChangeTargetType =
  | 'VOTE'
  | 'VOTE_DETAIL'
  | 'CANDIDATE'
  | 'VOTE_ATTACHMENT'
  | 'CANDIDATE_ATTACHMENT';
export type ContentChangeAction =
  'CREATED' | 'UPDATED' | 'DELETED' | 'STATUS_CHANGED' | 'POLICY_CHANGED';
export type ContentChangeActorType = 'ADMIN' | 'SYSTEM';
export type ResultStorageStatus = 'PENDING' | 'SAVED' | 'FAILED';
