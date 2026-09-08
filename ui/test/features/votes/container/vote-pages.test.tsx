/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVotesUiStore } from '@/features/votes/store/votes-ui.store';
import { voteFixtureDetails } from '@/features/votes/api/votes-fixtures';
import { ELECTORAL_ROLL_IDENTITY_REQUIRED_MESSAGE } from '@/features/votes/model/electoral-roll.types';
import { billingApi } from '@/features/billing/api/billing-api';
import type { BillingOrder } from '@/features/billing/model/billing.types';
import { voteOperationsApi } from '@/features/votes/api/vote-operations-api';
import { voteAttachmentApi } from '@/features/votes/api/vote-attachment-api';
import { electoralRollApi } from '@/features/votes/api/electoral-roll-api';

import { VoteDashboardContainer } from '@/features/votes/container/vote-dashboard-container';
import { CommissionManagementContainer } from '@/features/votes/container/commission-management-container';
import { CommissionSetupContainer } from '@/features/votes/container/commission-setup-container';
import { ElectorManagementContainer } from '@/features/votes/container/elector-management-container';
import { ElectoralRollManagementContainer } from '@/features/votes/container/electoral-roll-management-container';
import { ElectoralRollSetupContainer } from '@/features/votes/container/electoral-roll-setup-container';
import { SubVoteOperationsContainer } from '@/features/votes/container/sub-vote-operations-container';
import { VoteDetailContainer } from '@/features/votes/container/vote-detail-container';
import { VoteEditContainer } from '@/features/votes/container/vote-edit-container';
import { VoteListContainer } from '@/features/votes/container/vote-list-container';
import { VoteSetupContainer } from '@/features/votes/container/vote-setup-container';

const navigation = vi.hoisted(() => ({
  pathname: '/votes',
  replace: vi.fn(),
  search: '',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

const queryClients: QueryClient[] = [];
const voteFixtureSnapshots = structuredClone(voteFixtureDetails);

function billingOrder(
  id: string,
  voteId: string,
  status: BillingOrder['status'] = 'PENDING_PAYMENT',
): BillingOrder {
  return {
    amount: 3_000,
    baseAmount: 3_000,
    blockchainStorageAmount: 0,
    blockchainStorageCount: 0,
    blockchainStorageUnitPrice: 3_000,
    cancelableUntil: '2026-09-12T00:00:00.000Z',
    cancellationWindowDays: 7,
    currency: 'KRW',
    electorCount: 1,
    id,
    identityVerificationAmount: 0,
    identityVerificationRequired: false,
    identityVerificationUnitPrice: 30_000,
    issuedAt: '2026-09-05T00:00:00.000Z',
    orderedByUserPrincipalId: 'user-principal-1',
    pricingUnitCount: 1,
    pricingUnitSize: 100,
    productCode: 'VOTE_USAGE',
    productName: '투표 개설 이용료',
    status,
    unitPrice: 3_000,
    voteId,
  };
}

function renderWithQueryClient(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false,
      },
    },
  });

  queryClients.push(queryClient);

  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  );
}

describe('vote containers', () => {
  beforeEach(() => {
    navigation.pathname = '/votes';
    navigation.search = '';
    navigation.replace.mockReset();
    useVotesUiStore.getState().resetVotesUi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    queryClients.splice(0).forEach((queryClient) => queryClient.clear());
    voteFixtureDetails.splice(
      0,
      voteFixtureDetails.length,
      ...structuredClone(voteFixtureSnapshots),
    );
  });

  it('renders dashboard data from React Query', async () => {
    renderWithQueryClient(<VoteDashboardContainer />);

    expect(screen.getByLabelText('Mock API 및 인증 사용 중')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: '투표 생성' }).getAttribute('href'),
    ).toBe('/votes/new');
    expect(await screen.findByText('현재 진행 중인 투표')).toBeTruthy();
    expect(await screen.findAllByText('2026 상반기 대표 선출')).toHaveLength(2);
  });

  it('filters the vote list by status', async () => {
    renderWithQueryClient(<VoteListContainer />);

    expect(await screen.findByText('2026 상반기 대표 선출')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '예정' }));

    expect(screen.getByText('예산 승인 투표')).toBeTruthy();
    expect(screen.queryByText('2026 상반기 대표 선출')).toBeNull();
    expect(navigation.replace).toHaveBeenCalledWith('/votes?status=scheduled', {
      scroll: false,
    });
  });

  it('clears vote query state before refreshing the list', async () => {
    let finishRefresh: (() => void) | undefined;
    const resetQueries = vi
      .spyOn(QueryClient.prototype, 'resetQueries')
      .mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            finishRefresh = resolve;
          }),
      );
    renderWithQueryClient(<VoteListContainer />);

    expect(await screen.findByText('예산 승인 투표')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));

    expect(
      screen.getByRole('button', { name: '새로고침 중…' }),
    ).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: '새로고침 중…' }));
    expect(resetQueries).toHaveBeenCalledTimes(1);
    expect(resetQueries).toHaveBeenCalledWith({ queryKey: ['votes'] });

    finishRefresh?.();
    expect(
      screen.getByRole('button', { name: '새로고침 중…' }),
    ).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: '새로고침 중…' }));
    expect(resetQueries).toHaveBeenCalledTimes(1);

    await waitFor(
      () =>
        expect(screen.getByRole('button', { name: '새로고침' })).toHaveProperty(
          'disabled',
          false,
        ),
      { timeout: 1_500 },
    );
  });

  it('hydrates vote list filters from URL search params', async () => {
    navigation.search = 'status=scheduled&q=%EC%98%88%EC%82%B0';

    renderWithQueryClient(<VoteListContainer />);

    expect(await screen.findByDisplayValue('예산')).toBeTruthy();
    expect(await screen.findByText('예산 승인 투표')).toBeTruthy();
    expect(screen.queryByText('2026 상반기 대표 선출')).toBeNull();
  });

  it('resets filters from an empty filtered result', async () => {
    renderWithQueryClient(<VoteListContainer />);

    const searchInput = await screen.findByRole('searchbox', {
      name: '투표 제목 검색',
    });
    fireEvent.change(searchInput, { target: { value: '존재하지 않음' } });

    fireEvent.click(await screen.findByRole('button', { name: '필터 초기화' }));

    await waitFor(() => {
      expect(screen.getByText('2026 상반기 대표 선출')).toBeTruthy();
    });
    expect(navigation.replace).toHaveBeenLastCalledWith('/votes', {
      scroll: false,
    });
  });

  it('renders a not-found state for an unknown vote detail id', async () => {
    navigation.pathname = '/votes/missing';
    renderWithQueryClient(<VoteDetailContainer voteId="missing" />);

    expect(await screen.findByText('투표를 찾을 수 없습니다.')).toBeTruthy();
  });

  it('shows a finalized vote consistently and disables editing from detail', async () => {
    const vote = voteFixtureDetails.find(
      (item) => item.id === 'scheduled-budget',
    );
    if (!vote) throw new Error('scheduled-budget fixture is required');
    const originalStatus = vote.status;
    vote.status = 'finalized';

    try {
      renderWithQueryClient(<VoteDetailContainer voteId="scheduled-budget" />);

      expect(await screen.findByText('확정됨(개시 전)')).toBeTruthy();
      expect(screen.getByRole('button', { name: '투표 수정' })).toHaveProperty(
        'disabled',
        true,
      );
    } finally {
      vote.status = originalStatus;
    }
  });

  it('shows finalized votes in the vote list', async () => {
    const vote = voteFixtureDetails.find(
      (item) => item.id === 'scheduled-budget',
    );
    if (!vote) throw new Error('scheduled-budget fixture is required');
    const originalStatus = vote.status;
    vote.status = 'finalized';

    try {
      renderWithQueryClient(<VoteListContainer />);
      expect(await screen.findByText('확정됨(개시 전)')).toBeTruthy();
    } finally {
      vote.status = originalStatus;
    }
  });

  it('shows a server-restored pending payment in the vote list', async () => {
    const vote = voteFixtureDetails.find(
      (item) => item.id === 'scheduled-budget',
    );
    if (!vote) throw new Error('scheduled-budget fixture is required');
    const original = {
      activeBillingOrderId: vote.activeBillingOrderId,
      billingOrderStatus: vote.billingOrderStatus,
      status: vote.status,
    };
    vote.status = 'draft';
    vote.activeBillingOrderId = 'billing-order-restored-list';
    vote.billingOrderStatus = 'PENDING_PAYMENT';

    try {
      renderWithQueryClient(<VoteListContainer />);
      expect(await screen.findByText('결제 처리 중')).toBeTruthy();
    } finally {
      vote.status = original.status;
      vote.activeBillingOrderId = original.activeBillingOrderId;
      vote.billingOrderStatus = original.billingOrderStatus;
    }
  });

  it('restores pending-payment locking on direct detail entry', async () => {
    const vote = voteFixtureDetails.find(
      (item) => item.id === 'scheduled-budget',
    );
    if (!vote) throw new Error('scheduled-budget fixture is required');
    const original = {
      activeBillingOrderId: vote.activeBillingOrderId,
      billingOrderStatus: vote.billingOrderStatus,
      status: vote.status,
    };
    vote.status = 'draft';
    vote.activeBillingOrderId = 'billing-order-restored-detail';
    vote.billingOrderStatus = 'PENDING_PAYMENT';
    const fetchOrder = vi
      .spyOn(billingApi, 'fetchVoteUsageOrder')
      .mockResolvedValue(
        billingOrder('billing-order-restored-detail', vote.id),
      );

    try {
      renderWithQueryClient(<VoteDetailContainer voteId={vote.id} />);
      expect(await screen.findByText('결제 처리 중')).toBeTruthy();
      expect(screen.getByRole('button', { name: '투표 수정' })).toHaveProperty(
        'disabled',
        true,
      );
      await waitFor(() => {
        expect(fetchOrder).toHaveBeenCalledWith(
          'billing-order-restored-detail',
        );
      });
    } finally {
      fetchOrder.mockRestore();
      vote.status = original.status;
      vote.activeBillingOrderId = original.activeBillingOrderId;
      vote.billingOrderStatus = original.billingOrderStatus;
    }
  });

  it('restores pending-payment locking on direct edit entry', async () => {
    const vote = voteFixtureDetails.find(
      (item) => item.id === 'scheduled-budget',
    );
    if (!vote) throw new Error('scheduled-budget fixture is required');
    const original = {
      activeBillingOrderId: vote.activeBillingOrderId,
      billingOrderStatus: vote.billingOrderStatus,
      status: vote.status,
    };
    vote.status = 'draft';
    vote.activeBillingOrderId = 'billing-order-restored-edit';
    vote.billingOrderStatus = 'PENDING_PAYMENT';
    const fetchOrder = vi
      .spyOn(billingApi, 'fetchVoteUsageOrder')
      .mockResolvedValue(billingOrder('billing-order-restored-edit', vote.id));

    try {
      renderWithQueryClient(<VoteEditContainer voteId={vote.id} />);
      expect(await screen.findByText(/결제 결과가 확인될 때까지/)).toBeTruthy();
      expect(
        screen.getByRole('button', { name: '투표 설정 저장' }),
      ).toHaveProperty('disabled', true);
      expect(
        screen.getByRole('button', { name: '명부 다시 연결 또는 교체' }),
      ).toHaveProperty('disabled', true);
      await waitFor(() => {
        expect(fetchOrder).toHaveBeenCalledWith('billing-order-restored-edit');
      });
    } finally {
      fetchOrder.mockRestore();
      vote.status = original.status;
      vote.activeBillingOrderId = original.activeBillingOrderId;
      vote.billingOrderStatus = original.billingOrderStatus;
    }
  });

  it('shows finalized state and disables settings on the edit page', async () => {
    const vote = voteFixtureDetails.find(
      (item) => item.id === 'scheduled-budget',
    );
    if (!vote) throw new Error('scheduled-budget fixture is required');
    const originalStatus = vote.status;
    vote.status = 'finalized';

    try {
      renderWithQueryClient(<VoteEditContainer voteId="scheduled-budget" />);

      expect(await screen.findByText(/확정됨\(개시 전\) 상태/)).toBeTruthy();
      expect(
        screen.getByRole('button', { name: '투표 설정 저장' }),
      ).toHaveProperty('disabled', true);
      expect(
        screen.getByRole('button', { name: '명부 다시 연결 또는 교체' }),
      ).toHaveProperty('disabled', true);
      expect(
        screen.getByRole('button', { name: '후보자 안건 추가' }),
      ).toHaveProperty('disabled', true);
      expect(screen.getByRole('button', { name: '투표 삭제' })).toHaveProperty(
        'disabled',
        true,
      );
    } finally {
      vote.status = originalStatus;
    }
  });

  it('orders the edit sections and toggles each step independently', async () => {
    renderWithQueryClient(<VoteEditContainer voteId="scheduled-budget" />);

    const stepButtons = await screen.findAllByRole('button', {
      name: /\d단계 .* (펼치기|접기)/,
    });
    expect(
      stepButtons.map((button) => button.getAttribute('aria-label')),
    ).toEqual([
      '1단계 기본 정책 접기',
      '2단계 안건과 후보 펼치기',
      '3단계 선거인명부 펼치기',
      '4단계 운영 위원회 펼치기',
      '5단계 첨부파일 펼치기',
      '6단계 검토 펼치기',
    ]);

    fireEvent.click(
      screen.getByRole('button', { name: '1단계 기본 정책 접기' }),
    );
    expect(
      screen
        .getByRole('button', { name: '1단계 기본 정책 펼치기' })
        .getAttribute('aria-expanded'),
    ).toBe('false');

    fireEvent.click(
      screen.getByRole('button', { name: '2단계 안건과 후보 펼치기' }),
    );
    expect(
      screen
        .getByRole('button', { name: '2단계 안건과 후보 접기' })
        .getAttribute('aria-expanded'),
    ).toBe('true');
    expect(document.getElementById('vote-edit-step-basics')?.className).toBe(
      'hidden',
    );
    expect(
      document.getElementById('vote-edit-step-ballot')?.className,
    ).not.toBe('hidden');
  });

  it('adds an agenda and candidates from the vote edit page', async () => {
    const createSubVote = vi.spyOn(voteOperationsApi, 'createSubVote');
    const createCandidate = vi.spyOn(voteOperationsApi, 'createCandidate');

    renderWithQueryClient(<VoteEditContainer voteId="scheduled-budget" />);

    expect(
      await screen.findByRole('heading', { name: '안건과 후보' }),
    ).toBeTruthy();
    expect(screen.getByText('등록된 안건 1개')).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/선출할 직책 또는 안건/), {
      target: { value: '감사 선출' },
    });
    fireEvent.change(screen.getByLabelText('후보 1'), {
      target: { value: '김후보' },
    });
    fireEvent.change(screen.getByLabelText('후보 2'), {
      target: { value: '이후보' },
    });
    fireEvent.click(screen.getByRole('button', { name: '후보자 안건 추가' }));

    expect(await screen.findByText('안건을 추가했습니다.')).toBeTruthy();
    expect(createSubVote).toHaveBeenCalledWith({
      sortOrder: 1,
      title: '감사 선출',
      type: 'CANDIDATE',
      voteId: 'scheduled-budget',
    });
    expect(createCandidate).toHaveBeenCalledTimes(2);
    expect(createCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateNo: 1,
        name: '김후보',
        voteId: 'scheduled-budget',
      }),
    );
    expect(createCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateNo: 2,
        name: '이후보',
        voteId: 'scheduled-budget',
      }),
    );
    expect(await screen.findByText('등록된 안건 2개')).toBeTruthy();
    expect(screen.getByText('감사 선출')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: /찬성·반대/ }));
    fireEvent.change(screen.getByLabelText(/표결할 내용/), {
      target: { value: '정관 개정 승인' },
    });
    fireEvent.click(screen.getByRole('button', { name: '찬반 안건 추가' }));

    await waitFor(() => expect(createSubVote).toHaveBeenCalledTimes(2));
    expect(createSubVote).toHaveBeenLastCalledWith({
      sortOrder: 2,
      title: '정관 개정 승인',
      type: 'YES_NO',
      voteId: 'scheduled-budget',
    });
    expect(createCandidate).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('등록된 안건 3개')).toBeTruthy();
    expect(screen.getByText('정관 개정 승인')).toBeTruthy();
  });

  it('registers vote attachments from the vote edit page', async () => {
    navigation.pathname = '/votes/scheduled-budget/edit';
    const requestUpload = vi
      .spyOn(voteAttachmentApi, 'requestVoteUpload')
      .mockImplementation(async (_target, metadata) => ({
        expiresAt: '2099-09-06T12:00:00.000Z',
        metadata,
        storageKey: 'votes/notice-one',
        uploadHeaders: { 'Content-Type': metadata.mimeType },
        uploadUrl: 'https://storage.example/notice',
      }));
    const uploadObject = vi
      .spyOn(voteAttachmentApi, 'uploadObject')
      .mockResolvedValue(undefined);
    const confirmUpload = vi
      .spyOn(voteAttachmentApi, 'confirmVoteUpload')
      .mockImplementation(async () => {
        const voteIndex = voteFixtureDetails.findIndex(
          (item) => item.id === 'scheduled-budget',
        );
        const vote = voteFixtureDetails[voteIndex];
        if (!vote) throw new Error('scheduled-budget fixture is required');
        voteFixtureDetails.splice(voteIndex, 1, {
          ...vote,
          attachments: [
            ...(vote.attachments ?? []),
            {
              createdAt: '2026-09-06T12:00:00.000Z',
              fileId: 'file-one',
              id: 'attachment-one',
              mimeType: 'application/pdf',
              originalName: '공고문.pdf',
              sizeBytes: 6,
              sortOrder: 0,
              type: 'NOTICE',
            },
          ],
        });
        return {
          attachmentId: 'attachment-one',
          fileId: 'file-one',
          storageKey: 'votes/notice-one',
        };
      });

    try {
      renderWithQueryClient(<VoteEditContainer voteId="scheduled-budget" />);
      expect(
        await screen.findByRole('heading', {
          name: '투표 첨부파일',
        }),
      ).toBeTruthy();
      expect(
        screen.getByRole('heading', {
          name: '안건 및 후보자 첨부파일',
        }),
      ).toBeTruthy();
      const input = (await screen.findAllByLabelText('파일'))[0];
      if (!input) throw new Error('vote attachment file input is required');
      const file = new File(['notice'], '공고문.pdf', {
        type: 'application/pdf',
      });
      fireEvent.change(input, { target: { files: [file] } });
      const registerButton = screen.getAllByRole('button', {
        name: '첨부 등록',
      })[0];
      if (!registerButton) {
        throw new Error('vote attachment register button is required');
      }
      fireEvent.click(registerButton);

      expect(await screen.findByText('공고문.pdf')).toBeTruthy();
      expect(requestUpload).toHaveBeenCalledWith(
        { voteId: 'scheduled-budget' },
        expect.objectContaining({
          attachmentType: 'NOTICE',
          mimeType: 'application/pdf',
          originalName: '공고문.pdf',
        }),
      );
      expect(uploadObject).toHaveBeenCalledWith(
        expect.objectContaining({ storageKey: 'votes/notice-one' }),
        file,
      );
      expect(confirmUpload).toHaveBeenCalledWith(
        { voteId: 'scheduled-budget' },
        expect.objectContaining({ storageKey: 'votes/notice-one' }),
      );
    } finally {
      requestUpload.mockRestore();
      uploadObject.mockRestore();
      confirmUpload.mockRestore();
    }
  });

  it('shows vote attachments as download-only content on the detail page', async () => {
    const vote = voteFixtureDetails.find(
      (item) => item.id === 'scheduled-budget',
    );
    if (!vote) throw new Error('scheduled-budget fixture is required');
    vote.attachments = [
      {
        createdAt: '2026-09-06T12:00:00.000Z',
        fileId: 'file-read-only',
        id: 'attachment-read-only',
        mimeType: 'application/pdf',
        originalName: '상세 공고문.pdf',
        sizeBytes: 1024,
        sortOrder: 0,
        type: 'NOTICE',
      },
    ];

    renderWithQueryClient(<VoteDetailContainer voteId={vote.id} />);

    expect(await screen.findByText('상세 공고문.pdf')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '상세 공고문.pdf 다운로드' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: '첨부 등록' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: '상세 공고문.pdf 삭제' }),
    ).toBeNull();
  });

  it('requires confirmation and deletes a draft vote from the edit page', async () => {
    navigation.pathname = '/votes/scheduled-budget/edit';
    const vote = voteFixtureDetails.find(
      (item) => item.id === 'scheduled-budget',
    );
    if (!vote) throw new Error('scheduled-budget fixture is required');

    renderWithQueryClient(<VoteEditContainer voteId={vote.id} />);

    const deleteButton = await screen.findByRole('button', {
      name: '투표 삭제',
    });
    expect(deleteButton).toHaveProperty('disabled', true);

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /이 투표를 삭제하면 취소 상태가 되며/,
      }),
    );
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith('/votes');
    });
    expect(vote.status).toBe('canceled');
  });

  it('renders child-vote turnout and result operations', async () => {
    renderWithQueryClient(
      <SubVoteOperationsContainer
        voteId="active-general"
        voteDetailId="representative-election"
      />,
    );

    expect(await screen.findByText('대표 후보 선출')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '투표율' })).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: '후보자 및 첨부파일' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: '첨부 등록' })).toBeNull();
    expect(screen.queryByLabelText('파일')).toBeNull();
  });

  it('renders elector management with the registration form', async () => {
    renderWithQueryClient(
      <ElectorManagementContainer voteId="active-general" />,
    );

    expect(await screen.findByText('등록 선거인')).toBeTruthy();
    expect(screen.getByRole('button', { name: '선거인 등록' })).toBeTruthy();
  });

  it('confirms and blocks a manually managed draft elector', async () => {
    const vote = voteFixtureDetails.find(
      (item) => item.id === 'active-general',
    );
    if (!vote) throw new Error('active-general fixture is required');
    const elector = (await voteOperationsApi.fetchElectors(vote.id)).items[0];
    if (!elector) throw new Error('active-general elector fixture is required');
    const originalVoteStatus = vote.status;
    const originalElectorStatus = elector.status;
    vote.status = 'draft';

    try {
      renderWithQueryClient(<ElectorManagementContainer voteId={vote.id} />);

      const deleteButton = await screen.findByRole('button', {
        name: `${elector.name} 선거인 삭제`,
      });
      expect(deleteButton).toHaveProperty('disabled', false);
      fireEvent.click(deleteButton);
      expect(screen.getByRole('dialog')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: '취소' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(elector.status).toBe('ELIGIBLE');

      fireEvent.click(deleteButton);
      fireEvent.click(screen.getByRole('button', { name: '선거인 삭제' }));

      expect(
        await screen.findByText(`${elector.name} 선거인을 삭제했습니다.`),
      ).toBeTruthy();
      expect(elector.status).toBe('BLOCKED');
      expect(await screen.findByText('차단')).toBeTruthy();
    } finally {
      vote.status = originalVoteStatus;
      elector.status = originalElectorStatus;
    }
  });

  it('disables individual deletion for electoral-roll-managed electors', async () => {
    const vote = voteFixtureDetails.find(
      (item) => item.id === 'active-general',
    );
    if (!vote) throw new Error('active-general fixture is required');
    const original = {
      electoralRollSnapshotId: vote.electoralRollSnapshotId,
      status: vote.status,
    };
    vote.status = 'draft';
    vote.electoralRollSnapshotId = 'snapshot-managed';

    try {
      renderWithQueryClient(<ElectorManagementContainer voteId={vote.id} />);

      expect(
        await screen.findByText(/개별 등록하거나 삭제할 수 없습니다/),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: '이선거 선거인 삭제' }),
      ).toHaveProperty('disabled', true);
    } finally {
      vote.status = original.status;
      vote.electoralRollSnapshotId = original.electoralRollSnapshotId;
    }
  });

  it('queues bulk invitations and reissues an elector link without exposing a raw link', async () => {
    renderWithQueryClient(
      <ElectorManagementContainer voteId="active-general" />,
    );

    fireEvent.click(await screen.findByRole('button', {
      name: '전체 문자 발송 예약',
    }));
    expect(await screen.findByText(/발송 대기열에 등록했습니다/)).toBeTruthy();

    const linkButtons = screen.getAllByRole('button', {
      name: '링크 재발급',
    });
    fireEvent.click(linkButtons[0]);

    expect(
      screen.getByRole('heading', { name: '참여 링크 재발급' }),
    ).toBeTruthy();
    expect(screen.getByText(/기존 참여 링크를 폐기/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '새 링크 문자 발송' }));

    expect(await screen.findByText(/이전 링크는 폐기/)).toBeTruthy();
    expect(screen.getByRole('dialog').querySelector('input')).toBeNull();
    expect(document.body.textContent).not.toContain('/participate?');
  });

  it('disables manual elector registration for electoral-roll-managed votes', async () => {
    renderWithQueryClient(
      <ElectorManagementContainer voteId="scheduled-budget" />,
    );

    expect(
      await screen.findByText('선거인명부에서 관리되는 선거인입니다.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: '선거인 등록' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(
      screen.getByRole('link', { name: '선거인명부 관리' }),
    ).toHaveProperty('href', expect.stringContaining('/electoral-rolls'));
  });

  it('places the required commission before creation-driven steps', async () => {
    renderWithQueryClient(<VoteSetupContainer />);

    expect(
      screen.getByRole('heading', { level: 2, name: '기본 정책' }),
    ).toBeTruthy();
    expect(screen.getByLabelText('투표 제목')).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: '공개 범위' })).toBeNull();
    expect(screen.getByRole('group', { name: '공개 범위' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /비밀 투표/ })).toHaveProperty(
      'checked',
      true,
    );
    expect(screen.getByRole('radio', { name: /공개 투표/ })).toBeTruthy();
    expect(screen.getByRole('group', { name: '참여 단위' })).toBeTruthy();
    expect(screen.getByRole('group', { name: '가중치 방식' })).toBeTruthy();
    expect(screen.getByRole('group', { name: '결과 저장' })).toBeTruthy();
    expect(
      screen.getByRole('combobox', { name: '인증 제공자' }),
    ).toHaveProperty('disabled', true);
    fireEvent.click(
      screen.getByRole('checkbox', { name: /본인인증 필수/ }),
    );
    expect(
      screen.getByRole('combobox', { name: '인증 제공자' }),
    ).toHaveProperty('value', 'PASS');
    expect(
      screen.getByRole('combobox', { name: '인증 방식' }),
    ).toHaveProperty('value', 'MOBILE');
    expect(screen.queryByLabelText('선거인명부 ID')).toBeNull();
    expect(screen.queryByLabelText('투표 운영 위원회')).toBeNull();
    expect(screen.queryByRole('button', { name: '위원회 등록' })).toBeNull();
    expect(screen.queryByRole('button', { name: '위원 등록' })).toBeNull();
    const progress = screen.getByRole('navigation', {
      name: '투표 설정 진행 상태',
    });
    expect(
      Array.from(progress.querySelectorAll('button'), (button) =>
        button.textContent?.trim(),
      ),
    ).toEqual([
      '기본 정책',
      '안건과 후보',
      '선거인명부',
      '운영 위원회',
      '첨부파일',
      '검토',
    ]);
  });

  it('shows commissions in the same list-detail structure as electoral rolls', async () => {
    renderWithQueryClient(<CommissionManagementContainer />);

    expect(
      await screen.findByRole('heading', { name: '위원회 목록' }),
    ).toBeTruthy();
    expect(screen.getByRole('table', { name: '위원회 목록' })).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: '새 위원회 만들기' })
        .getAttribute('href'),
    ).toBe('/commissions/new');
    expect(screen.queryByRole('button', { name: '위원 등록' })).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: '전자투표 운영위원회 열기' }),
    );
    expect(
      await screen.findByRole('button', { name: '위원회 목록' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: '위원 등록' })).toBeTruthy();
    expect(screen.getByText('김관리')).toBeTruthy();
    expect(screen.getByText('등록 위원')).toBeTruthy();
    expect(screen.getByText('2명')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('새 위원 이름'), {
      target: { value: '박신규' },
    });
    const registerButton = screen.getByRole<HTMLButtonElement>('button', {
      name: '위원 등록',
    });
    await waitFor(() => expect(registerButton.disabled).toBe(false));
    fireEvent.click(registerButton);
    expect(await screen.findByText('박신규 위원을 등록했습니다.')).toBeTruthy();
    expect(await screen.findByText('박신규')).toBeTruthy();
  });

  it('creates a commission on the dedicated setup page and opens its detail', async () => {
    const createCommission = vi
      .spyOn(voteOperationsApi, 'createCommission')
      .mockResolvedValue({
        id: 'commission-new',
        members: [],
        name: '신규 운영',
        status: 'ACTIVE',
      });
    renderWithQueryClient(<CommissionSetupContainer />);

    fireEvent.change(screen.getByLabelText('위원회 이름'), {
      target: { value: '  신규 운영  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '위원회 만들기' }));

    await waitFor(() => {
      expect(createCommission).toHaveBeenCalledWith('신규 운영');
      expect(navigation.replace).toHaveBeenCalledWith(
        '/commissions?commissionId=commission-new',
      );
    });
  });

  it('creates a vote by connecting an existing electoral roll', async () => {
    const createSubVote = vi.spyOn(voteOperationsApi, 'createSubVote');
    renderWithQueryClient(<VoteSetupContainer />);

    fireEvent.change(screen.getByLabelText('투표 제목'), {
      target: { value: 'Mock 신규 투표' },
    });
    fireEvent.change(screen.getByLabelText('투표 시작 날짜'), {
      target: { value: '2026-09-10' },
    });
    fireEvent.change(screen.getByLabelText('투표 시작 시간'), {
      target: { value: '09:00' },
    });
    fireEvent.change(screen.getByLabelText('투표 종료 날짜'), {
      target: { value: '2026-09-10' },
    });
    fireEvent.change(screen.getByLabelText('투표 종료 시간'), {
      target: { value: '18:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: '안건과 후보로 이동' }));

    expect(
      await screen.findByRole('heading', { name: '안건과 후보' }),
    ).toBeTruthy();
    fireEvent.change(await screen.findByLabelText('선출할 직책 또는 안건'), {
      target: { value: 'Mock 대표 선출' },
    });
    fireEvent.change(screen.getByLabelText('후보 1'), {
      target: { value: '후보 가' },
    });
    fireEvent.change(screen.getByLabelText('후보 2'), {
      target: { value: '후보 나' },
    });
    fireEvent.click(screen.getByRole('button', { name: '후보자 안건 추가' }));

    expect(screen.getByText(/현재 1개 안건을 입력했습니다/)).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Mock 대표 선출' }),
    ).toBeTruthy();
    expect(screen.getByText('후보 1 · 후보 가')).toBeTruthy();
    expect(screen.getByText('후보 2 · 후보 나')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /찬성·반대/ }));
    expect(screen.queryByLabelText('후보 1')).toBeNull();
    expect(screen.queryByLabelText('후보 2')).toBeNull();
    fireEvent.change(screen.getByLabelText('표결할 내용'), {
      target: { value: 'Mock 예산 승인' },
    });
    fireEvent.click(screen.getByRole('button', { name: '찬반 안건 추가' }));

    expect(screen.getByText(/현재 2개 안건을 입력했습니다/)).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Mock 대표 선출' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Mock 예산 승인' }),
    ).toBeTruthy();
    expect(screen.getByText('찬성 / 반대')).toBeTruthy();
    expect(screen.queryByLabelText('정렬 순서')).toBeNull();

    let draggedIndex = '';
    const dataTransfer = {
      dropEffect: 'none',
      effectAllowed: 'none',
      getData: vi.fn(() => draggedIndex),
      setData: vi.fn((_type: string, value: string) => {
        draggedIndex = value;
      }),
    };
    fireEvent.dragStart(
      screen.getByRole('button', {
        name: 'Mock 대표 선출 안건 끌어서 이동',
      }),
      { dataTransfer },
    );
    fireEvent.dragOver(
      screen.getByRole('article', { name: 'Mock 예산 승인 안건' }),
      { dataTransfer },
    );
    fireEvent.drop(
      screen.getByRole('article', { name: 'Mock 예산 승인 안건' }),
      { dataTransfer },
    );

    const reorderedArticles = screen
      .getByLabelText('추가된 안건 목록')
      .querySelectorAll('article');
    expect(reorderedArticles[0]?.textContent).toContain('Mock 예산 승인');
    expect(reorderedArticles[1]?.textContent).toContain('Mock 대표 선출');
    fireEvent.click(screen.getByRole('button', { name: '선거인명부로 이동' }));

    expect(
      await screen.findByRole('heading', { name: '선거인명부' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: '선거인 추가' })).toBeNull();
    const electoralRollSelect =
      await screen.findByLabelText('연결할 선거인명부');
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: '운영 위원회로 이동',
      }).disabled,
    ).toBe(true);
    fireEvent.change(electoralRollSelect, {
      target: { value: 'electoral-roll-1' },
    });
    expect((electoralRollSelect as HTMLSelectElement).value).toBe(
      'electoral-roll-1',
    );
    fireEvent.click(screen.getByRole('button', { name: '운영 위원회로 이동' }));

    expect(
      await screen.findByRole('heading', { name: '선거관리위원회' }),
    ).toBeTruthy();
    expect(
      await screen.findByRole('option', { name: '위원회를 선택하세요' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        '미리 등록한 위원회 중 이 투표를 운영할 위원회를 선택합니다.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: '투표 생성 후 첨부파일',
      }).disabled,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText('투표 운영 위원회'), {
      target: { value: 'commission-1' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: '투표 생성 후 첨부파일' }),
    );

    expect(
      await screen.findByRole('heading', { name: '첨부파일 등록' }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: '투표 첨부파일' })).toBeTruthy();
    expect(
      screen.getByRole('heading', {
        name: 'Mock 대표 선출 · 후보 가 첨부파일',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', {
        name: 'Mock 대표 선출 · 후보 나 첨부파일',
      }),
    ).toBeTruthy();
    expect(screen.getAllByRole('button', { name: '첨부 등록' })).toHaveLength(
      3,
    );
    fireEvent.click(
      screen.getByRole('button', { name: '설정 검토로 이동' }),
    );

    expect(
      await screen.findByRole('heading', { name: '설정 검토' }),
    ).toBeTruthy();
    expect(screen.queryByText('미지정')).toBeNull();
    expect(screen.getByText('2개')).toBeTruthy();
    expect(screen.getByText('2026 상반기 선거인명부')).toBeTruthy();
    expect(screen.getByText('전자투표 운영위원회')).toBeTruthy();
    expect(screen.queryByText('commission-1')).toBeNull();
    expect(screen.queryByText('electoral-roll-1')).toBeNull();
    expect(screen.queryByText('electoral-roll-snapshot-1')).toBeNull();
    expect(
      screen.queryByText(/부모 투표 ID|위원회 ID|스냅샷 ID|자식 투표 ID/),
    ).toBeNull();
    expect(
      screen.getByRole('link', { name: '1번 안건 후보 첨부' }),
    ).toHaveProperty('href', expect.stringContaining('/sub-votes/'));
    expect(
      screen.getByRole('link', { name: '2번 안건 후보 첨부' }),
    ).toHaveProperty('href', expect.stringContaining('/sub-votes/'));
    expect(
      screen.getByRole('heading', { name: '투표 이용료 결제 주문' }),
    ).toBeTruthy();
    expect(
      createSubVote.mock.calls.slice(-2).map(([input]) => ({
        sortOrder: input.sortOrder,
        title: input.title,
      })),
    ).toEqual([
      { sortOrder: 0, title: 'Mock 예산 승인' },
      { sortOrder: 1, title: 'Mock 대표 선출' },
    ]);
    expect(screen.getByRole('checkbox')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: '이용료 결제 요청',
      }),
    ).toHaveProperty('disabled', true);
    expect(
      voteFixtureDetails.find((vote) => vote.title === 'Mock 신규 투표'),
    ).toMatchObject({
      startsAt: new Date('2026-09-10T09:00:00').toISOString(),
      endsAt: new Date('2026-09-10T18:00:00').toISOString(),
    });
  });

  it('rejects a vote creation window whose end is not after its start', async () => {
    renderWithQueryClient(<VoteSetupContainer />);

    fireEvent.change(screen.getByLabelText('투표 제목'), {
      target: { value: '잘못된 기간의 투표' },
    });
    fireEvent.change(screen.getByLabelText('투표 시작 날짜'), {
      target: { value: '2026-09-10' },
    });
    fireEvent.change(screen.getByLabelText('투표 시작 시간'), {
      target: { value: '09:00' },
    });
    fireEvent.change(screen.getByLabelText('투표 종료 날짜'), {
      target: { value: '2026-09-10' },
    });
    fireEvent.change(screen.getByLabelText('투표 종료 시간'), {
      target: { value: '09:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: '안건과 후보로 이동' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      '투표 종료 시각은 시작 시각보다 이후여야 합니다.',
    );
    expect(
      screen.getByRole('heading', { level: 2, name: '기본 정책' }),
    ).toBeTruthy();
  });

  it('sets the vote end with a quick duration option', () => {
    renderWithQueryClient(<VoteSetupContainer />);

    expect(document.querySelector('input[type="datetime-local"]')).toBeNull();
    fireEvent.change(screen.getByLabelText('투표 시작 날짜'), {
      target: { value: '2026-09-10' },
    });
    fireEvent.change(screen.getByLabelText('투표 시작 시간'), {
      target: { value: '09:30' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: '시작 시각부터 1일 뒤에 종료',
      }),
    );

    expect(screen.getByLabelText('투표 종료 날짜')).toHaveProperty(
      'value',
      '2026-09-11',
    );
    expect(screen.getByLabelText('투표 종료 시간')).toHaveProperty(
      'value',
      '09:30',
    );
    expect(screen.getByText(/· 1일$/)).toBeTruthy();
  });

  it('manages the assigned commission while editing a vote', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      Date.parse('2026-09-01T08:59:59.999Z'),
    );
    renderWithQueryClient(<VoteEditContainer voteId="scheduled-budget" />);

    expect(await screen.findByText('투표 기본 설정')).toBeTruthy();
    expect(screen.getByDisplayValue('예산 승인 투표')).toBeTruthy();
    expect(screen.getAllByText('전자투표 운영위원회')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: '위원 등록' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '위원회 등록' })).toBeNull();
    expect(
      screen.getByRole('heading', { name: '선거인명부 연결' }),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText('연결할 선거인명부'), {
      target: { value: 'electoral-roll-1' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: '명부 다시 연결 또는 교체' }),
    );
    expect(
      await screen.findByText(
        '선거인명부를 연결했습니다. 2명의 선거인이 적용되었습니다.',
      ),
    ).toBeTruthy();

    expect(
      screen.getByRole('heading', { name: '투표 이용료 결제 주문' }),
    ).toBeTruthy();
    expect(screen.queryByText('확정 전에 필요한 설정')).toBeNull();

    const finalizeButton = screen.getByRole('button', {
      name: '이용료 결제 요청',
    });
    expect(finalizeButton).toHaveProperty('disabled', true);
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /결제가 완료되거나 주문 취소·환불이 끝날 때까지/,
      }),
    );
    fireEvent.click(finalizeButton);

    expect(
      await screen.findByText(
        '결제 주문을 생성했습니다. 결제가 완료될 때까지 투표 설정이 잠깁니다.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('결제 대기')).toBeTruthy();
    expect(screen.getAllByText(/결제 처리 중/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: '투표 설정 저장' }),
    ).toHaveProperty('disabled', true);
  });

  it('blocks a payment request when the scheduled start time has arrived', async () => {
    const createVoteUsageOrder = vi.spyOn(
      billingApi,
      'createVoteUsageOrder',
    );
    vi.spyOn(Date, 'now').mockReturnValue(
      Date.parse('2026-09-01T09:00:00.000Z'),
    );

    renderWithQueryClient(<VoteEditContainer voteId="scheduled-budget" />);

    expect(
      await screen.findByText(
        '투표 시작 시각이 되었거나 이미 지나 확정할 수 없습니다. 시작 시각을 미래로 변경하세요.',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole('checkbox', {
        name: /결제가 완료되거나 주문 취소·환불이 끝날 때까지/,
      }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: '이용료 결제 요청' }),
    ).toHaveProperty('disabled', true);
    expect(createVoteUsageOrder).not.toHaveBeenCalled();
  });

  it('validates and updates the explicit vote schedule', async () => {
    const vote = voteFixtureDetails.find(
      (item) => item.id === 'scheduled-budget',
    );
    if (!vote) throw new Error('scheduled-budget fixture is required');
    renderWithQueryClient(<VoteEditContainer voteId={vote.id} />);

    expect(await screen.findByText('투표 기본 설정')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('투표 시작 날짜'), {
      target: { value: '2026-09-20' },
    });
    fireEvent.change(screen.getByLabelText('투표 시작 시간'), {
      target: { value: '09:00' },
    });
    fireEvent.change(screen.getByLabelText('투표 종료 날짜'), {
      target: { value: '2026-09-20' },
    });
    fireEvent.change(screen.getByLabelText('투표 종료 시간'), {
      target: { value: '09:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: '투표 설정 저장' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      '투표 종료 시각은 시작 시각보다 이후여야 합니다.',
    );

    fireEvent.change(screen.getByLabelText('투표 종료 시간'), {
      target: { value: '18:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: '투표 설정 저장' }));

    expect(await screen.findByText('투표 설정을 저장했습니다.')).toBeTruthy();
    expect(vote).toMatchObject({
      startsAt: new Date('2026-09-20T09:00:00').toISOString(),
      endsAt: new Date('2026-09-20T18:00:00').toISOString(),
    });
  });

  it('preserves the current vote policy in explanatory choices while editing', async () => {
    const vote = voteFixtureDetails.find(
      (item) => item.id === 'active-general',
    );
    if (!vote) throw new Error('active-general fixture is required');

    renderWithQueryClient(<VoteEditContainer voteId={vote.id} />);

    expect(await screen.findByText('투표 기본 설정')).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: '공개 범위' })).toBeNull();
    expect(screen.getByRole('radio', { name: /비밀 투표/ })).toHaveProperty(
      'checked',
      true,
    );
    expect(
      screen.getByRole('radio', { name: /동일 가중치/ }),
    ).toHaveProperty('checked', true);
    expect(screen.getByRole('group', { name: '허용 채널' })).toBeTruthy();
    expect(screen.getByRole('group', { name: '본인인증' })).toBeTruthy();
    expect(
      screen.getByRole('checkbox', { name: /본인인증 필수/ }),
    ).toBeTruthy();
  });

  it('explains why an incomplete roll cannot be attached to an identity-required vote', async () => {
    const vote = voteFixtureDetails.find(
      (item) => item.id === 'scheduled-budget',
    );
    if (!vote) throw new Error('scheduled-budget fixture is required');
    const originalPolicy = vote.identityVerificationPolicy;
    vote.identityVerificationPolicy = { required: true };

    try {
      renderWithQueryClient(<VoteEditContainer voteId="scheduled-budget" />);

      expect(await screen.findByText('투표 기본 설정')).toBeTruthy();
      fireEvent.change(screen.getByLabelText('연결할 선거인명부'), {
        target: { value: 'electoral-roll-1' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: '명부 다시 연결 또는 교체' }),
      );

      expect((await screen.findByRole('alert')).textContent).toContain(
        ELECTORAL_ROLL_IDENTITY_REQUIRED_MESSAGE,
      );
    } finally {
      vote.identityVerificationPolicy = originalPolicy;
    }
  });

  it('operates field sessions from the vote detail', async () => {
    navigation.pathname = '/votes/active-general';
    renderWithQueryClient(<VoteDetailContainer voteId="active-general" />);

    expect(
      await screen.findByRole('heading', { name: '현장 투표 운영' }),
    ).toBeTruthy();
    expect(await screen.findByText('현장 및 방문 세션')).toBeTruthy();
    expect(await screen.findByText('본관 현장 투표소')).toBeTruthy();
    expect(screen.getByRole('button', { name: '세션 생성' })).toBeTruthy();
    expect(screen.getByRole('option', { name: '현장' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: '방문' })).toBeNull();
    expect(screen.queryByLabelText('조회할 투표 ID')).toBeNull();
    expect(screen.queryByLabelText('관리자 ID')).toBeNull();
    expect(screen.queryByText('active-general')).toBeNull();
    expect(screen.queryByText('field-session-1')).toBeNull();
    expect(await screen.findByLabelText('김관리 · 관리자')).toBeTruthy();
    expect(screen.getByLabelText('오현장 · 현장 관리자')).toBeTruthy();
    expect(screen.queryByRole('link', { name: '현장 운영' })).toBeNull();
    expect(screen.queryByRole('link', { name: '선거인 관리' })).toBeNull();

    fireEvent.change(screen.getByLabelText('본관 현장 투표소 안내 문자'), {
      target: { value: '본관 1층 운영 시간을 확인해 주세요.' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: '본관 현장 투표소 안내 문자 발송',
      }),
    );

    expect(
      await screen.findByText(/총 2명에게 세션 안내 문자를 발송했습니다/),
    ).toBeTruthy();
    expect(screen.getByLabelText('본관 현장 투표소 안내 문자')).toHaveProperty(
      'value',
      '',
    );
  });

  it('sends a state-specific vote message and shows dispatch details', async () => {
    navigation.pathname = '/votes/active-general';
    renderWithQueryClient(<VoteDetailContainer voteId="active-general" />);

    expect(
      await screen.findByRole('heading', { name: '문자 안내' }),
    ).toBeTruthy();
    expect(screen.getByText('참여 독려')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('문자 내용'), {
      target: { value: '아직 참여하지 않은 선거인께 안내드립니다.' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: '참여 독려 문자 발송' }),
    );

    expect(
      await screen.findByText(/총 2명에게 문자를 발송했습니다/),
    ).toBeTruthy();
    expect(screen.getByLabelText('문자 내용')).toHaveProperty('value', '');
    expect(
      await screen.findByRole('table', { name: '문자 발송 이력' }),
    ).toBeTruthy();
    expect(
      await screen.findByRole('table', { name: '수신자별 문자 발송 결과' }),
    ).toBeTruthy();
    expect(screen.getByText('SIMULATED_RANDOM_FAILURE')).toBeTruthy();
    expect(screen.queryByText('010-****-1201')).toBeNull();
    expect(
      screen.queryByText('아직 참여하지 않은 선거인께 안내드립니다.'),
    ).toBeNull();
  });

  it('hides field-session operations for online-only votes', async () => {
    navigation.pathname = '/votes/scheduled-budget';
    renderWithQueryClient(<VoteDetailContainer voteId="scheduled-budget" />);

    expect(await screen.findByText('예산 승인 투표')).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: '현장 투표 운영' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: '세션 생성' })).toBeNull();
  });

  it('manages electoral-roll members without exposing snapshot details', async () => {
    renderWithQueryClient(<ElectoralRollManagementContainer />);

    expect(await screen.findByText('2026 상반기 선거인명부')).toBeTruthy();
    expect(screen.getByRole('table', { name: '선거인명부 목록' })).toBeTruthy();
    expect(
      screen.queryByRole('columnheader', { name: '선거관리위원회 ID' }),
    ).toBeNull();
    expect(screen.queryByLabelText('선거관리위원회 ID')).toBeNull();
    expect(
      screen.queryByRole('table', {
        name: '명부 구성원 정보 및 수정 기능',
      }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole('button', {
        name: '2026 상반기 선거인명부 열기',
      }),
    );
    expect(
      await screen.findByRole('button', { name: '선거인명부 목록' }),
    ).toBeTruthy();
    expect(screen.getByLabelText('member-101 구성원 이름')).toHaveProperty(
      'value',
      '김*표',
    );
    expect(
      screen.getByLabelText('member-101 구성원 휴대폰번호'),
    ).toHaveProperty('value', '010-****-1201');
    expect(screen.getByLabelText('member-101 구성원 생년월일')).toHaveProperty(
      'value',
      '1990-**-**',
    );

    fireEvent.change(screen.getByLabelText('새 구성원 식별자'), {
      target: { value: 'invalid-member' },
    });
    fireEvent.change(screen.getByLabelText('새 구성원 이름'), {
      target: { value: '이름만' },
    });
    fireEvent.click(screen.getByRole('button', { name: '구성원 초안 추가' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      '이름과 휴대폰번호는 함께 입력하세요.',
    );

    fireEvent.change(screen.getByLabelText('새 구성원 식별자'), {
      target: { value: 'new-member' },
    });
    fireEvent.change(screen.getByLabelText('새 구성원 이름'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: '구성원 초안 추가' }));

    expect(
      await screen.findByLabelText('new-member 구성원 식별자'),
    ).toHaveProperty('value', 'new-member');
    expect(
      screen.getByRole('button', { name: '선거인명부 저장 (1)' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: '변경 저장' })).toBeNull();

    fireEvent.change(screen.getByLabelText('member-101 구성원 식별자'), {
      target: { value: 'member-101-updated' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'member-102 구성원 제거' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: '선거인명부 저장 (3)' }),
    );

    expect(
      await screen.findByText('선거인명부 변경 3건을 저장했습니다.'),
    ).toBeTruthy();
    expect(
      await screen.findByLabelText('member-101-updated 구성원 식별자'),
    ).toHaveProperty('value', 'member-101-updated');
    expect(screen.queryByLabelText('member-102 구성원 식별자')).toBeNull();
    expect(
      screen.getByRole('table', {
        name: '명부 구성원 정보 및 수정 기능',
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('columnheader', { name: '구성원 ID' }),
    ).toBeNull();
    expect(screen.getByRole('columnheader', { name: '식별자' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: '이름' })).toBeTruthy();
    expect(
      screen.getByRole('columnheader', { name: '휴대폰번호' }),
    ).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: '생년월일' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: '그룹 키' })).toBeTruthy();
    expect(
      screen.getByRole('columnheader', { name: '투표 가중치' }),
    ).toBeTruthy();
    expect(screen.getByLabelText('명부 구성원 검색')).toBeTruthy();
    expect(screen.queryByText('electoral-roll-1')).toBeNull();
    expect(screen.queryByText('electoral-roll-member-1')).toBeNull();
    expect(
      screen.queryByRole('heading', { name: '선거인명부 스냅샷' }),
    ).toBeNull();
    expect(screen.queryByText('최신 revision')).toBeNull();
    expect(screen.queryByRole('button', { name: '스냅샷 생성' })).toBeNull();
    expect(screen.queryByLabelText('연결할 투표 ID')).toBeNull();
    expect(screen.queryByRole('button', { name: '투표에 연결' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '선거인명부 목록' }));
    expect(
      await screen.findByRole('table', { name: '선거인명부 목록' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('table', {
        name: '명부 구성원 정보 및 수정 기능',
      }),
    ).toBeNull();
  });

  it('links the roll list to the dedicated creation flow', async () => {
    renderWithQueryClient(<ElectoralRollManagementContainer />);

    expect(await screen.findByText('2026 상반기 선거인명부')).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: '새 선거인명부 만들기' })
        .getAttribute('href'),
    ).toBe('/electoral-rolls/new');
    expect(screen.queryByLabelText('명부 이름')).toBeNull();
  });

  it('creates a reviewed electoral roll with manually entered members', async () => {
    const createRoll = vi
      .spyOn(electoralRollApi, 'createElectoralRoll')
      .mockResolvedValue({
        id: 'new-electoral-roll',
        name: '2026 정기총회 명부',
        revision: 1,
      });
    const addMembers = vi
      .spyOn(electoralRollApi, 'addMembers')
      .mockResolvedValue({
        addedMemberCount: 1,
        electoralRollId: 'new-electoral-roll',
        revision: 2,
      });
    renderWithQueryClient(<ElectoralRollSetupContainer />);

    expect(
      screen.getByRole('navigation', {
        name: '선거인명부 생성 진행 상태',
      }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText('선거인명부 이름'), {
      target: { value: '2026 정기총회 명부' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: '구성원 등록으로 이동' }),
    );

    expect(
      await screen.findByRole('heading', { name: '구성원 등록 방식' }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: /^엑셀로 일괄 등록/ })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /^직접 입력/ }));
    fireEvent.change(screen.getByLabelText('식별자'), {
      target: { value: 'member-new' },
    });
    fireEvent.change(screen.getByLabelText('이름'), {
      target: { value: '김선거' },
    });
    fireEvent.click(screen.getByRole('button', { name: '구성원 추가' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      '이름과 휴대폰번호는 함께 입력하세요.',
    );

    fireEvent.change(screen.getByLabelText('휴대폰번호'), {
      target: { value: '010-1234-5678' },
    });
    fireEvent.click(screen.getByRole('button', { name: '구성원 추가' }));
    expect((await screen.findAllByText('member-new')).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('김선거 · 010-1234-5678').length,
    ).toBeGreaterThan(0);
    fireEvent.click(
      screen.getByRole('button', { name: '구성원 검토로 이동' }),
    );

    expect(
      await screen.findByRole('heading', { name: '생성 내용 검토' }),
    ).toBeTruthy();
    expect(screen.getByText('2026 정기총회 명부')).toBeTruthy();
    expect(screen.getAllByText('1명').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '선거인명부 생성' }));

    expect(
      await screen.findByRole('heading', { name: '선거인명부 생성 완료' }),
    ).toBeTruthy();
    expect(createRoll).toHaveBeenCalledWith({ name: '2026 정기총회 명부' });
    expect(addMembers).toHaveBeenCalledWith({
      electoralRollId: 'new-electoral-roll',
      members: [
        {
          birthDate: undefined,
          groupKey: undefined,
          identifier: 'member-new',
          name: '김선거',
          phoneNumber: '010-1234-5678',
          rowNumber: 1,
          voteWeight: 1,
        },
      ],
    });
  });

  it('deletes an electoral roll after explicit confirmation', async () => {
    const deleteRoll = vi
      .spyOn(electoralRollApi, 'deleteElectoralRoll')
      .mockResolvedValue();
    renderWithQueryClient(<ElectoralRollManagementContainer />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: '2026 상반기 선거인명부 열기',
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: '선거인명부 삭제' }),
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/불변 스냅샷과 투표 기록은 유지/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));

    expect(
      await screen.findByText(
        '선거인명부를 삭제했습니다. 기존 투표 기록은 유지됩니다.',
      ),
    ).toBeTruthy();
    expect(deleteRoll.mock.calls[0]?.[0]).toEqual({
      electoralRollId: 'electoral-roll-1',
    });
    deleteRoll.mockRestore();
  });

  it('updates and deletes commission members and the commission', async () => {
    const updateMember = vi
      .spyOn(voteOperationsApi, 'updateCommissionMember')
      .mockResolvedValue();
    const deleteMember = vi
      .spyOn(voteOperationsApi, 'deleteCommissionMember')
      .mockResolvedValue();
    const deleteCommission = vi
      .spyOn(voteOperationsApi, 'deleteCommission')
      .mockResolvedValue();
    renderWithQueryClient(<CommissionManagementContainer />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: '전자투표 운영위원회 열기',
      }),
    );
    fireEvent.change(await screen.findByLabelText('오현장 위원 이름'), {
      target: { value: '오현장 수정' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: '오현장 위원 변경 저장' }),
    );
    expect(
      await screen.findByText('오현장 수정 위원 정보를 수정했습니다.'),
    ).toBeTruthy();
    expect(updateMember.mock.calls[0]?.[0]).toEqual({
      commissionId: 'commission-1',
      memberId: 'commission-member-2',
      name: '오현장 수정',
      role: 'FIELD_MANAGER',
    });

    fireEvent.click(screen.getByRole('button', { name: '오현장 위원 삭제' }));
    expect(
      screen.getByText(/마지막 활성 관리자는 삭제할 수 없습니다/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(
      await screen.findByText(
        '위원을 삭제했습니다. 기존 투표 기록은 유지됩니다.',
      ),
    ).toBeTruthy();
    expect(deleteMember.mock.calls[0]?.[0]).toEqual({
      commissionId: 'commission-1',
      memberId: 'commission-member-2',
    });

    fireEvent.click(screen.getByRole('button', { name: '위원회 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(
      await screen.findByText(
        '위원회를 삭제했습니다. 기존 투표 기록은 유지됩니다.',
      ),
    ).toBeTruthy();
    expect(deleteCommission.mock.calls[0]?.[0]).toEqual({
      commissionId: 'commission-1',
    });

    updateMember.mockRestore();
    deleteMember.mockRestore();
    deleteCommission.mockRestore();
  });
});
