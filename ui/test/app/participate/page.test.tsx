import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAppSession = vi.hoisted(() => vi.fn());
const ParticipationContainer = vi.hoisted(() => vi.fn());
const SignInContainer = vi.hoisted(() => vi.fn());

vi.mock('@/shared/auth/app-session', () => ({ getAppSession }));
vi.mock('@/features/participation/container/participation-container', () => ({
  ParticipationContainer,
}));
vi.mock('@/features/auth/container/sign-in-container', () => ({
  SignInContainer,
}));

import ParticipatePage from '@/app/participate/page';

describe('participate page', () => {
  beforeEach(() => {
    getAppSession.mockReset();
    ParticipationContainer.mockReset();
    SignInContainer.mockReset();
  });

  it('opens mock=true preview without requiring a login or identifiers', async () => {
    getAppSession.mockResolvedValue(null);

    const element = await ParticipatePage({
      searchParams: Promise.resolve({ mock: 'true' }),
    });

    expect(element.type).toBe(ParticipationContainer);
    expect(element.props).toMatchObject({
      electorLabel: '선거인',
      previewMode: true,
    });
    expect(getAppSession).not.toHaveBeenCalled();
  });

  it('keeps normal participation behind the login screen', async () => {
    getAppSession.mockResolvedValue(null);

    const element = await ParticipatePage({
      searchParams: Promise.resolve({}),
    });

    expect(element.type).toBe(SignInContainer);
  });
});
