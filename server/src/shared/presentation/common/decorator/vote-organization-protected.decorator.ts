import { SetMetadata } from '@nestjs/common';

export const VOTE_ORGANIZATION_PROTECTED = 'vote-organization-protected';
export type VoteOrganizationAccess = 'read' | 'manage';

export const VoteOrganizationProtected = (
  access: VoteOrganizationAccess = 'manage',
) => SetMetadata(VOTE_ORGANIZATION_PROTECTED, access);
