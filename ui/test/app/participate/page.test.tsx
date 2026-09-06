import { beforeEach, describe, expect, it, vi } from 'vitest';

const ParticipationAccessContainer = vi.hoisted(() => vi.fn());

vi.mock('@/features/participation/container/participation-access-container', () => ({
  ParticipationAccessContainer,
}));

import ParticipatePage from '@/app/participate/page';

describe('participate page', () => {
  beforeEach(() => ParticipationAccessContainer.mockReset());

  it('opens public participation without consulting an OIDC session', async () => {
    const element = await ParticipatePage({ searchParams: Promise.resolve({}) });
    expect(element.type).toBe(ParticipationAccessContainer);
    expect(element.props.previewMode).toBe(false);
  });

  it('keeps the isolated screen preview mode', async () => {
    const element = await ParticipatePage({ searchParams: Promise.resolve({ mock: 'true' }) });
    expect(element.type).toBe(ParticipationAccessContainer);
    expect(element.props.previewMode).toBe(true);
  });
});
