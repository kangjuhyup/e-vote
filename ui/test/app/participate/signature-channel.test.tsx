import { describe, expect, it, vi } from 'vitest';
vi.mock('@/shared/auth/app-session', () => ({
  getAppSession: async () => ({ user: { name: '선거인' } }),
}));
vi.mock('@/features/participation/container/participation-container', () => ({
  ParticipationContainer: () => null,
}));
vi.mock('@/features/auth/container/sign-in-container', () => ({
  SignInContainer: () => null,
}));
import ParticipatePage from '@/app/participate/page';

describe('Participation channel routing', () => {
  it.each(['ONLINE', 'ONSITE', 'VISIT'] as const)(
    'passes the %s channel into the signature-gated flow',
    async (votingChannel) => {
      const page = await ParticipatePage({
        searchParams: Promise.resolve({ votingChannel }),
      });
      expect(page.props.votingChannel).toBe(votingChannel);
    },
  );
});
