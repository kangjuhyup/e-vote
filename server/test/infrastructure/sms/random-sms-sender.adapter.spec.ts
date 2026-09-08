import type { ElectorReadRepositoryPort } from '../../../src/modules/elector/application/port/persistence/query/elector-read-repository.port';
import {
  ElectorPageView,
  ElectorView,
} from '../../../src/modules/elector/application/query/dto/response/elector.view';
import { ElectorSmsRecipientAccessAdapter } from '../../../src/modules/elector/infrastructure/sms/elector-sms-recipient-access.adapter';
import { RandomSmsSenderAdapter } from '../../../src/shared/infrastructure/sms/random-sms-sender.adapter';
import type {
  SmsRecipientAccessPort,
  SmsRecipientReference,
} from '../../../src/shared/application/port/capability/sms-recipient-access.port';
import { SmsDeliveryStatus } from '../../../src/shared/domain/sms/type/sms-delivery-status.type';
import { ElectorStatus } from '../../../src/shared/domain/voting/type/elector-status.type';

describe('RandomSmsSenderAdapter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends participation reminders only to eligible non-participants', async () => {
    const recipientAccess = createRecipientAccess([
      createRecipient('elector-1'),
      createRecipient('elector-2', { participated: true }),
      createRecipient('elector-3', { status: ElectorStatus.Blocked }),
      createRecipient('elector-without-link'),
    ]);
    jest.spyOn(Math, 'random').mockReturnValue(0.1);

    const result = await new RandomSmsSenderAdapter(
      recipientAccess,
    ).sendParticipationReminderToNonParticipants({
      voteId: 'vote-1',
      templateCode: 'VOTE_PARTICIPATION_REMINDER',
      recipients: [
        {
          electorId: 'elector-1',
          invitationGeneration: 1,
          participationUrl:
            'https://vote.example.test/participate#access_token=one',
        },
        {
          electorId: 'elector-2',
          invitationGeneration: 1,
          participationUrl:
            'https://vote.example.test/participate#access_token=two',
        },
      ],
    });

    expect(result.deliveries).toEqual([
      {
        electorId: 'elector-1',
        recipientName: '선거인 elector-1',
        recipientIdentifier: 'member-elector-1',
        status: SmsDeliveryStatus.Success,
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('access_token');
  });

  it.each([
    'sendResultNotice',
    'sendUpcomingVoteNotice',
    'sendFieldVotingSessionNotice',
  ] as const)(
    '%s returns random success and failure outcomes',
    async (method) => {
      const recipientAccess = createRecipientAccess([
        createRecipient('elector-1'),
        createRecipient('elector-2'),
      ]);
      jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0.2)
        .mockReturnValueOnce(0.9);
      const adapter = new RandomSmsSenderAdapter(recipientAccess);

      const result = await adapter[method]({
        voteId: 'vote-1',
        fieldVotingSessionId: 'session-1',
        message: '안내',
      });

      expect(result.deliveries).toEqual([
        expect.objectContaining({
          electorId: 'elector-1',
          status: SmsDeliveryStatus.Success,
        }),
        expect.objectContaining({
          electorId: 'elector-2',
          status: SmsDeliveryStatus.Failure,
          failureReason: 'SIMULATED_RANDOM_FAILURE',
        }),
      ]);
    },
  );

  it('loads every elector page before creating delivery outcomes', async () => {
    const pages = [
      { items: [createRecipient('elector-1')], totalPages: 2 },
      { items: [createRecipient('elector-2')], totalPages: 2 },
    ];
    const findPage = jest
      .fn()
      .mockResolvedValueOnce(pages[0])
      .mockResolvedValueOnce(pages[1]);
    const recipientAccess: SmsRecipientAccessPort = {
      findPage,
    };
    jest.spyOn(Math, 'random').mockReturnValue(0.1);

    const result = await new RandomSmsSenderAdapter(
      recipientAccess,
    ).sendUpcomingVoteNotice({ voteId: 'vote-1', message: '예정 안내' });

    expect(findPage.mock.calls).toEqual([
      [{ voteId: 'vote-1', page: 1, pageSize: 100 }],
      [{ voteId: 'vote-1', page: 2, pageSize: 100 }],
    ]);
    expect(result.deliveries).toHaveLength(2);
  });

  it('maps elector read models through the shared recipient capability', async () => {
    const elector = ElectorView.of({
      id: 'elector-1',
      voteId: 'vote-1',
      name: '홍길동',
      identifier: 'member-1',
      voteWeight: 1,
      status: ElectorStatus.Eligible,
      identityVerified: false,
      participated: true,
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
      updatedAt: new Date('2026-08-30T00:00:00.000Z'),
    });
    const electorRepository: ElectorReadRepositoryPort = {
      findDetailById: jest.fn(),
      findPage: jest.fn().mockResolvedValue(
        ElectorPageView.of({
          items: [elector],
          page: 1,
          pageSize: 100,
          totalItems: 1,
          totalPages: 1,
        }),
      ),
    };

    await expect(
      new ElectorSmsRecipientAccessAdapter(electorRepository).findPage({
        voteId: 'vote-1',
        page: 1,
        pageSize: 100,
      }),
    ).resolves.toEqual({
      items: [
        {
          electorId: 'elector-1',
          name: '홍길동',
          identifier: 'member-1',
          status: ElectorStatus.Eligible,
          participated: true,
        },
      ],
      totalPages: 1,
    });
  });
});

function createRecipientAccess(
  recipients: readonly SmsRecipientReference[],
): SmsRecipientAccessPort {
  return {
    findPage: jest.fn().mockResolvedValue({
      items: recipients,
      totalPages: recipients.length === 0 ? 0 : 1,
    }),
  };
}

function createRecipient(
  id: string,
  overrides: {
    readonly status?: ElectorStatus;
    readonly participated?: boolean;
  } = {},
): SmsRecipientReference {
  return {
    electorId: id,
    name: `선거인 ${id}`,
    identifier: `member-${id}`,
    status: overrides.status ?? ElectorStatus.Eligible,
    participated: overrides.participated ?? false,
  };
}
