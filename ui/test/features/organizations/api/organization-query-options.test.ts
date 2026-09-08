import { describe, expect, it } from 'vitest';

import {
  myOrganizationApplicationQueryOptions,
  organizationApplicationAdminQueryOptions,
} from '@/features/organizations/api/organization-query-options';

describe('organization query options', () => {
  it('keeps applicant and paginated admin caches separate', () => {
    expect(myOrganizationApplicationQueryOptions().queryKey).toContain('me');
    expect(
      organizationApplicationAdminQueryOptions(2, 'PENDING').queryKey,
    ).toEqual(expect.arrayContaining(['admin', 2, 'PENDING']));
  });
});
