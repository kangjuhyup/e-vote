import { beforeEach, describe, expect, it, vi } from 'vitest';

const ParticipationAccessContainer = vi.hoisted(() => vi.fn());
const mocks = vi.hoisted(() => ({
  getAppSession: vi.fn(), ParticipationContainer: vi.fn(), SignInContainer: vi.fn(),
}));
vi.mock('@/shared/auth/app-session', () => ({ getAppSession: mocks.getAppSession }));
vi.mock('@/features/participation/container/participation-container', () => ({ ParticipationContainer: mocks.ParticipationContainer }));
vi.mock('@/features/auth/container/sign-in-container', () => ({ SignInContainer: mocks.SignInContainer }));

vi.mock('@/features/participation/container/participation-access-container', () => ({
  ParticipationAccessContainer,
}));

import ParticipatePage from '@/app/participate/page';

describe('participate page', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getAppSession.mockResolvedValue(null); });

  it('requires login before opening the identity verification participation flow', async () => {
    const element = await ParticipatePage({ searchParams: Promise.resolve({ voteId: 'vote-1', electorId: 'elector-1' }) });
    expect(element.type).toBe(mocks.SignInContainer);
    expect(element.props.redirectTo).toBe('/participate?voteId=vote-1&electorId=elector-1');
  });

  it('opens the existing identity verification flow for an authenticated account', async () => {
    mocks.getAppSession.mockResolvedValue({ user: { name: '선거인' } });
    const element = await ParticipatePage({ searchParams: Promise.resolve({ voteId: 'vote-1', electorId: 'elector-1' }) });
    expect(element.type).toBe(mocks.ParticipationContainer);
    expect(element.props).toMatchObject({ voteId: 'vote-1', electorId: 'elector-1', electorLabel: '선거인' });
  });

  it('opens public participation without consulting an OIDC session', async () => {
    const element = await ParticipatePage({ searchParams: Promise.resolve({}) });
    expect(element.type).toBe(ParticipationAccessContainer);
    expect(element.props.previewMode).toBe(false);
    expect(mocks.getAppSession).not.toHaveBeenCalled();
  });

  it('keeps the isolated screen preview mode', async () => {
    const element = await ParticipatePage({ searchParams: Promise.resolve({ mock: 'true' }) });
    expect(element.type).toBe(ParticipationAccessContainer);
    expect(element.props.previewMode).toBe(true);
  });
});
