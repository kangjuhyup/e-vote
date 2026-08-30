import { CandidateReadRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/query/candidate-read-repository.port';
import { ElectorReadRepositoryPort } from '../../../../src/modules/elector/application/port/persistence/query/elector-read-repository.port';
import { VoteDetailReadRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/query/vote-detail-read-repository.port';
import {
  CandidateNotFoundError,
  GetCandidateHandler,
} from '../../../../src/modules/vote/application/query/handler/get-candidate.handler';
import { GetCandidatePageHandler } from '../../../../src/modules/vote/application/query/handler/get-candidate-page.handler';
import { GetCandidatePageQuery } from '../../../../src/modules/vote/application/query/dto/request/get-candidate-page.query';
import { GetCandidateQuery } from '../../../../src/modules/vote/application/query/dto/request/get-candidate.query';
import {
  ElectorNotFoundError,
  GetElectorHandler,
} from '../../../../src/modules/elector/application/query/handler/get-elector.handler';
import { GetElectorPageHandler } from '../../../../src/modules/elector/application/query/handler/get-elector-page.handler';
import { GetElectorPageQuery } from '../../../../src/modules/elector/application/query/dto/request/get-elector-page.query';
import { GetElectorQuery } from '../../../../src/modules/elector/application/query/dto/request/get-elector.query';
import {
  GetVoteDetailHandler,
  VoteDetailNotFoundError,
} from '../../../../src/modules/vote/application/query/handler/get-vote-detail.handler';
import { GetVoteDetailPageHandler } from '../../../../src/modules/vote/application/query/handler/get-vote-detail-page.handler';
import { GetVoteDetailPageQuery } from '../../../../src/modules/vote/application/query/dto/request/get-vote-detail-page.query';
import { GetVoteDetailQuery } from '../../../../src/modules/vote/application/query/dto/request/get-vote-detail.query';
import {
  CandidatePageReadView,
  CandidateReadView,
} from '../../../../src/modules/vote/application/query/dto/response/candidate-read.view';
import {
  ElectorPageView,
  ElectorView,
} from '../../../../src/modules/elector/application/query/dto/response/elector.view';
import {
  VoteDetailPageReadView,
  VoteDetailReadView,
} from '../../../../src/modules/vote/application/query/dto/response/vote-detail-read.view';
import { CandidateStatus } from '../../../../src/shared/domain/voting/type/candidate-status.type';
import { ElectorStatus } from '../../../../src/shared/domain/voting/type/elector-status.type';
import { VoteDetailStatus } from '../../../../src/shared/domain/voting/type/vote-status.type';

describe('remaining resource query handlers', () => {
  it('loads vote detail detail and page read models', async () => {
    const voteDetail = createVoteDetailView();
    const page = VoteDetailPageReadView.of({
      items: [voteDetail],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });
    const findDetailById = jest.fn().mockResolvedValue(voteDetail);
    const findPage = jest.fn().mockResolvedValue(page);
    const repository: VoteDetailReadRepositoryPort = {
      findDetailById,
      findPage,
    };

    await expect(
      new GetVoteDetailHandler(repository).execute(
        GetVoteDetailQuery.of({
          voteId: 'vote-1',
          voteDetailId: 'vote-detail-1',
        }),
      ),
    ).resolves.toBe(voteDetail);
    await expect(
      new GetVoteDetailPageHandler(repository).execute(
        GetVoteDetailPageQuery.of({
          voteId: 'vote-1',
          page: 0,
          pageSize: 101,
        }),
      ),
    ).resolves.toBe(page);
    expect(findDetailById).toHaveBeenCalledWith('vote-1', 'vote-detail-1');
    expect(findPage).toHaveBeenCalledWith({
      voteId: 'vote-1',
      page: 1,
      pageSize: 100,
    });
  });

  it('throws when a vote detail is missing', async () => {
    const repository: VoteDetailReadRepositoryPort = {
      findDetailById: jest.fn().mockResolvedValue(undefined),
      findPage: jest.fn().mockResolvedValue(
        VoteDetailPageReadView.of({
          items: [],
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        }),
      ),
    };

    await expect(
      new GetVoteDetailHandler(repository).execute(
        GetVoteDetailQuery.of({
          voteId: 'vote-1',
          voteDetailId: 'missing-detail',
        }),
      ),
    ).rejects.toBeInstanceOf(VoteDetailNotFoundError);
  });

  it('loads elector detail and page read models', async () => {
    const elector = createElectorView();
    const page = ElectorPageView.of({
      items: [elector],
      page: 2,
      pageSize: 10,
      totalItems: 11,
      totalPages: 2,
    });
    const findPage = jest.fn().mockResolvedValue(page);
    const repository: ElectorReadRepositoryPort = {
      findDetailById: jest.fn().mockResolvedValue(elector),
      findPage,
    };

    await expect(
      new GetElectorHandler(repository).execute(
        GetElectorQuery.of({
          voteId: 'vote-1',
          electorId: 'elector-1',
        }),
      ),
    ).resolves.toBe(elector);
    await expect(
      new GetElectorPageHandler(repository).execute(
        GetElectorPageQuery.of({
          voteId: 'vote-1',
          page: 2,
          pageSize: 10,
        }),
      ),
    ).resolves.toBe(page);
    expect(findPage).toHaveBeenCalledWith({
      voteId: 'vote-1',
      page: 2,
      pageSize: 10,
    });
  });

  it('throws when an elector is missing', async () => {
    const repository: ElectorReadRepositoryPort = {
      findDetailById: jest.fn().mockResolvedValue(undefined),
      findPage: jest.fn().mockResolvedValue(
        ElectorPageView.of({
          items: [],
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        }),
      ),
    };

    await expect(
      new GetElectorHandler(repository).execute(
        GetElectorQuery.of({
          voteId: 'vote-1',
          electorId: 'missing-elector',
        }),
      ),
    ).rejects.toBeInstanceOf(ElectorNotFoundError);
  });

  it('loads candidate detail and page read models', async () => {
    const candidate = createCandidateView();
    const page = CandidatePageReadView.of({
      items: [candidate],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });
    const findDetailById = jest.fn().mockResolvedValue(candidate);
    const findPage = jest.fn().mockResolvedValue(page);
    const repository: CandidateReadRepositoryPort = {
      findDetailById,
      findPage,
    };

    await expect(
      new GetCandidateHandler(repository).execute(
        GetCandidateQuery.of({
          voteId: 'vote-1',
          voteDetailId: 'vote-detail-1',
          candidateId: 'candidate-1',
        }),
      ),
    ).resolves.toBe(candidate);
    await expect(
      new GetCandidatePageHandler(repository).execute(
        GetCandidatePageQuery.of({
          voteId: 'vote-1',
          voteDetailId: 'vote-detail-1',
        }),
      ),
    ).resolves.toBe(page);
    expect(findDetailById).toHaveBeenCalledWith(
      'vote-1',
      'vote-detail-1',
      'candidate-1',
    );
    expect(findPage).toHaveBeenCalledWith({
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
      page: 1,
      pageSize: 20,
    });
  });

  it('throws when a candidate is missing', async () => {
    const repository: CandidateReadRepositoryPort = {
      findDetailById: jest.fn().mockResolvedValue(undefined),
      findPage: jest.fn().mockResolvedValue(
        CandidatePageReadView.of({
          items: [],
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        }),
      ),
    };

    await expect(
      new GetCandidateHandler(repository).execute(
        GetCandidateQuery.of({
          voteId: 'vote-1',
          voteDetailId: 'vote-detail-1',
          candidateId: 'missing-candidate',
        }),
      ),
    ).rejects.toBeInstanceOf(CandidateNotFoundError);
  });
});

const now = new Date('2026-08-13T00:00:00.000Z');

function createVoteDetailView(): VoteDetailReadView {
  return VoteDetailReadView.of({
    id: 'vote-detail-1',
    voteId: 'vote-1',
    title: 'President',
    description: '',
    type: 'CANDIDATE',
    sortOrder: 0,
    status: VoteDetailStatus.Draft,
    createdAt: now,
    updatedAt: now,
  });
}

function createElectorView(): ElectorView {
  return ElectorView.of({
    id: 'elector-1',
    voteId: 'vote-1',
    name: 'Kim Min Su',
    identifier: 'member-1',
    phoneNumber: '010-1234-5678',
    birthDate: '1990-01-31',
    groupKey: 'group-1',
    voteWeight: 1,
    status: ElectorStatus.Eligible,
    identityVerified: true,
    participated: true,
    participatedAt: new Date('2026-08-13T00:30:00.000Z'),
    createdAt: now,
    updatedAt: now,
  });
}

function createCandidateView(): CandidateReadView {
  return CandidateReadView.of({
    id: 'candidate-1',
    voteId: 'vote-1',
    voteDetailId: 'vote-detail-1',
    candidateNo: 1,
    name: 'Kim',
    description: '',
    status: CandidateStatus.Active,
    createdAt: now,
    updatedAt: now,
  });
}
