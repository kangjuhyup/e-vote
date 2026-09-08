import { SetMetadata } from '@nestjs/common';

export const VOTE_ORGANIZATION_PROTECTED = 'vote-organization-protected';

export const VoteOrganizationProtected = () =>
  SetMetadata(VOTE_ORGANIZATION_PROTECTED, true);
