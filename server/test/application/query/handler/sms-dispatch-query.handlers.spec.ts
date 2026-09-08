import type { SmsDispatchReadRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/query/sms-dispatch-read-repository.port';
import { GetSmsDispatchPageQuery } from '../../../../src/modules/vote/application/query/dto/request/get-sms-dispatch-page.query';
import { GetSmsDispatchQuery } from '../../../../src/modules/vote/application/query/dto/request/get-sms-dispatch.query';
import {
  SmsDispatchPageView,
  SmsDispatchView,
} from '../../../../src/modules/vote/application/query/dto/response/sms-dispatch.view';
import { GetSmsDispatchPageHandler } from '../../../../src/modules/vote/application/query/handler/get-sms-dispatch-page.handler';
import {
  GetSmsDispatchHandler,
  SmsDispatchNotFoundError,
} from '../../../../src/modules/vote/application/query/handler/get-sms-dispatch.handler';
import { SmsMessagePurpose } from '../../../../src/shared/domain/voting/type/sms-message-purpose.type';

describe('SMS dispatch query handlers', () => {
  it('loads a normalized vote-scoped summary page and detail', async () => {
    const detail = createDetail();
    const page = SmsDispatchPageView.of({
      items: [detail],
      page: 1,
      pageSize: 100,
      totalItems: 1,
      totalPages: 1,
    });
    const findPage = jest.fn().mockResolvedValue(page);
    const repository: SmsDispatchReadRepositoryPort = {
      findPage,
      findDetail: jest.fn().mockResolvedValue(detail),
    };

    await expect(
      new GetSmsDispatchPageHandler(repository).execute(
        GetSmsDispatchPageQuery.of({
          voteId: 'vote-1',
          page: 0,
          pageSize: 101,
        }),
      ),
    ).resolves.toBe(page);
    expect(findPage).toHaveBeenCalledWith({
      voteId: 'vote-1',
      page: 1,
      pageSize: 100,
    });

    await expect(
      new GetSmsDispatchHandler(repository).execute(
        GetSmsDispatchQuery.of({
          voteId: 'vote-1',
          smsDispatchId: 'dispatch-1',
          page: 2,
          pageSize: 50,
        }),
      ),
    ).resolves.toBe(detail);
  });

  it('rejects a missing or cross-vote dispatch detail', async () => {
    const repository: SmsDispatchReadRepositoryPort = {
      findPage: jest.fn(),
      findDetail: jest.fn().mockResolvedValue(undefined),
    };

    await expect(
      new GetSmsDispatchHandler(repository).execute(
        GetSmsDispatchQuery.of({
          voteId: 'another-vote',
          smsDispatchId: 'dispatch-1',
        }),
      ),
    ).rejects.toBeInstanceOf(SmsDispatchNotFoundError);
  });
});

function createDetail(): SmsDispatchView {
  return SmsDispatchView.of({
    id: 'dispatch-1',
    voteId: 'vote-1',
    purpose: SmsMessagePurpose.UpcomingVoteNotice,
    sentAt: new Date('2026-08-30T01:00:00.000Z'),
    recipientCount: 0,
    successCount: 0,
    failureCount: 0,
    deliveries: [],
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  });
}
