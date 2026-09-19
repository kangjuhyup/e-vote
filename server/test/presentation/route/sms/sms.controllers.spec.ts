import { TEST_USER_PRINCIPAL } from '../../user-principal.fixture';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SendVoteSmsCommand } from '../../../../src/modules/vote/application/command/dto/request/send-vote-sms.command';
import {
  SendVoteSmsHandler,
  VoteSmsAccessDeniedError,
} from '../../../../src/modules/vote/application/command/handler/send-vote-sms.handler';
import { VoteSmsController } from '../../../../src/modules/vote/presentation/vote-sms/vote-sms.controller';
import { SendFieldVotingSessionSmsCommand } from '../../../../src/modules/field-voting/application/command/dto/request/send-field-voting-session-sms.command';
import { SendFieldVotingSessionSmsHandler } from '../../../../src/modules/field-voting/application/command/handler/send-field-voting-session-sms.handler';
import { FieldVotingSessionSmsController } from '../../../../src/modules/field-voting/presentation/field-voting-session-sms/field-voting-session-sms.controller';
import { SmsSenderNotConfiguredError } from '../../../../src/shared/application/error/sms-sender.error';
import { SmsMessagePurpose } from '../../../../src/shared/domain/voting/type/sms-message-purpose.type';
import { VoteSmsReadController } from '../../../../src/modules/vote/presentation/vote-sms/vote-sms-read.controller';
import { GetSmsDispatchPageHandler } from '../../../../src/modules/vote/application/query/handler/get-sms-dispatch-page.handler';
import {
  GetSmsDispatchHandler,
  SmsDispatchNotFoundError,
} from '../../../../src/modules/vote/application/query/handler/get-sms-dispatch.handler';
import { SmsDeliveryStatus } from '../../../../src/shared/domain/sms/type/sms-delivery-status.type';
import { DomainError } from '../../../../src/shared/domain/domain-error';
import { maskDecoratedPersonalData } from '../../../../src/shared/presentation/common/serializer/mask-personal-data';

describe('SMS controllers', () => {
  const sendVoteExecute = jest.fn<
    ReturnType<SendVoteSmsHandler['execute']>,
    [SendVoteSmsCommand]
  >();
  const sendFieldSessionExecute = jest.fn<
    ReturnType<SendFieldVotingSessionSmsHandler['execute']>,
    [SendFieldVotingSessionSmsCommand]
  >();
  const getParticipationReminderTemplateExecute = jest.fn();
  const voteController = new VoteSmsController(
    {
      execute: sendVoteExecute,
    } as unknown as SendVoteSmsHandler,
    {
      execute: getParticipationReminderTemplateExecute,
    },
    {
      execute: jest.fn((purpose) => ({ code: purpose, content: '고정 문안' })),
    },
  );
  const fieldSessionController = new FieldVotingSessionSmsController({
    execute: sendFieldSessionExecute,
  } as unknown as SendFieldVotingSessionSmsHandler);
  const getPageExecute = jest.fn();
  const getExecute = jest.fn();
  const readController = new VoteSmsReadController(
    { execute: getPageExecute } as unknown as GetSmsDispatchPageHandler,
    { execute: getExecute } as unknown as GetSmsDispatchHandler,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns the server-owned participation reminder preview', () => {
    getParticipationReminderTemplateExecute.mockReturnValue({
      code: 'VOTE_PARTICIPATION_REMINDER',
      content: '참여 안내',
      buttonLabel: '투표 참여하기',
    });

    expect(
      voteController.getParticipationReminderTemplate(TEST_USER_PRINCIPAL, {
        voteId: 'vote-1',
      }),
    ).toEqual({
      code: 'VOTE_PARTICIPATION_REMINDER',
      content: '참여 안내',
      buttonLabel: '투표 참여하기',
    });
    expect(getParticipationReminderTemplateExecute).toHaveBeenCalledWith(
      expect.objectContaining({ voteId: 'vote-1' }),
    );
  });

  it('returns fixed previews for the upcoming and result notices', () => {
    expect(voteController.getUpcomingVoteNoticeTemplate()).toEqual({
      code: SmsMessagePurpose.UpcomingVoteNotice,
      content: '고정 문안',
    });
    expect(voteController.getResultNoticeTemplate()).toEqual({
      code: SmsMessagePurpose.VoteResultNotice,
      content: '고정 문안',
    });
  });

  it('returns a conflict when an upcoming notice loses the race to a refund', async () => {
    sendVoteExecute.mockRejectedValue(
      new DomainError(
        'upcoming vote notices require an active paid billing order',
      ),
    );

    await expect(
      voteController.sendUpcomingVoteNotice(TEST_USER_PRINCIPAL, {
        voteId: 'vote-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    {
      invoke: () =>
        voteController.sendParticipationReminder(TEST_USER_PRINCIPAL, {
          voteId: 'vote-1',
        }),
      purpose: SmsMessagePurpose.VoteParticipationReminder,
    },
    {
      invoke: () =>
        voteController.sendResultNotice(TEST_USER_PRINCIPAL, {
          voteId: 'vote-1',
        }),
      purpose: SmsMessagePurpose.VoteResultNotice,
    },
    {
      invoke: () =>
        voteController.sendUpcomingVoteNotice(TEST_USER_PRINCIPAL, {
          voteId: 'vote-1',
        }),
      purpose: SmsMessagePurpose.UpcomingVoteNotice,
    },
  ])('maps a fixed vote SMS endpoint to $purpose', async (testCase) => {
    sendVoteExecute.mockResolvedValue({
      smsDispatchId: 'dispatch-1',
      purpose: testCase.purpose,
      voteId: 'vote-1',
      sentAt: new Date('2026-08-30T01:00:00.000Z'),
      recipientCount: 7,
      successCount: 6,
      failureCount: 1,
    });

    const response = await testCase.invoke();

    expect(sendVoteExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        voteId: 'vote-1',
        requestedByUserPrincipalId: TEST_USER_PRINCIPAL.id,
        purpose: testCase.purpose,
      }),
    );
    expect(response).toEqual({
      smsDispatchId: 'dispatch-1',
      purpose: testCase.purpose,
      voteId: 'vote-1',
      sentAt: '2026-08-30T01:00:00.000Z',
      recipientCount: 7,
      successCount: 6,
      failureCount: 1,
    });
  });

  it('maps the field-session SMS endpoint to its command handler', async () => {
    sendFieldSessionExecute.mockResolvedValue({
      smsDispatchId: 'dispatch-1',
      fieldVotingSessionId: 'session-1',
      voteId: 'vote-1',
      sentAt: new Date('2026-08-30T01:00:00.000Z'),
      recipientCount: 4,
      successCount: 4,
      failureCount: 0,
    });

    const response = await fieldSessionController.sendFieldVotingSessionNotice(
      TEST_USER_PRINCIPAL,
      { fieldVotingSessionId: 'session-1' },
      { message: '현장 투표 안내' },
    );

    expect(sendFieldSessionExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldVotingSessionId: 'session-1',
        message: '현장 투표 안내',
      }),
    );
    expect(response).toEqual({
      purpose: SmsMessagePurpose.FieldVotingSessionNotice,
      smsDispatchId: 'dispatch-1',
      fieldVotingSessionId: 'session-1',
      voteId: 'vote-1',
      sentAt: '2026-08-30T01:00:00.000Z',
      recipientCount: 4,
      successCount: 4,
      failureCount: 0,
    });
  });

  it('maps a missing SMS adapter to HTTP 503', async () => {
    sendVoteExecute.mockRejectedValue(new SmsSenderNotConfiguredError());

    await expect(
      voteController.sendUpcomingVoteNotice(TEST_USER_PRINCIPAL, {
        voteId: 'vote-1',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('maps a non-owner SMS request to HTTP 403', async () => {
    sendVoteExecute.mockRejectedValue(new VoteSmsAccessDeniedError());

    await expect(
      voteController.sendParticipationReminder(TEST_USER_PRINCIPAL, {
        voteId: 'vote-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('maps summary and recipient detail query results', async () => {
    const summary = {
      id: 'dispatch-1',
      voteId: 'vote-1',
      purpose: SmsMessagePurpose.UpcomingVoteNotice,
      sentAt: new Date('2026-08-30T01:00:00.000Z'),
      recipientCount: 2,
      successCount: 1,
      failureCount: 1,
    } as const;
    getPageExecute.mockResolvedValue({
      items: [summary],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });
    getExecute.mockResolvedValue({
      ...summary,
      deliveries: [
        {
          electorId: 'elector-1',
          recipientName: '홍길동',
          recipientIdentifier: 'member-1',
          status: SmsDeliveryStatus.Failure,
          failureReason: 'invalid destination',
        },
      ],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });

    const page = await readController.getSmsDispatchPage(
      TEST_USER_PRINCIPAL,
      { voteId: 'vote-1' },
      {},
    );
    expect(page).toMatchObject({
      items: [
        {
          id: 'dispatch-1',
          sentAt: '2026-08-30T01:00:00.000Z',
          successCount: 1,
          failureCount: 1,
        },
      ],
      totalItems: 1,
    });

    const detail = await readController.getSmsDispatch(
      TEST_USER_PRINCIPAL,
      {
        voteId: 'vote-1',
        smsDispatchId: 'dispatch-1',
      },
      {},
    );
    expect(detail.deliveries[0]).toEqual({
      electorId: 'elector-1',
      recipientName: '홍길동',
      recipientIdentifier: 'member-1',
      status: SmsDeliveryStatus.Failure,
      failureReason: 'invalid destination',
    });
    expect(detail).not.toHaveProperty('phoneNumber');
    expect(maskDecoratedPersonalData(detail).deliveries[0]).toMatchObject({
      recipientName: '홍*동',
      recipientIdentifier: 'member-1',
    });
  });

  it('maps a missing or cross-vote dispatch to HTTP 404', async () => {
    getExecute.mockRejectedValue(new SmsDispatchNotFoundError());
    await expect(
      readController.getSmsDispatch(
        TEST_USER_PRINCIPAL,
        {
          voteId: 'another-vote',
          smsDispatchId: 'dispatch-1',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
