import { TEST_USER_PRINCIPAL } from '../../user-principal.fixture';
import { RecordFieldParticipationEvidenceCommand } from '../../../../src/modules/field-voting/application/command/dto/request/record-field-participation-evidence.command';
import { RecordFieldParticipationEvidenceHandler } from '../../../../src/modules/field-voting/application/command/handler/record-field-participation-evidence.handler';
import { FieldParticipationEvidenceController } from '../../../../src/modules/field-voting/presentation/participation/field-participation-evidence.controller';

describe('FieldParticipationEvidenceController', () => {
  const execute = jest.fn<
    ReturnType<RecordFieldParticipationEvidenceHandler['execute']>,
    [RecordFieldParticipationEvidenceCommand]
  >();
  const handler = {
    execute,
  } as unknown as jest.Mocked<RecordFieldParticipationEvidenceHandler>;
  let controller: FieldParticipationEvidenceController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FieldParticipationEvidenceController(handler);
  });

  it('maps POST /participations/:participationId/field-evidence to evidence handler', async () => {
    execute.mockResolvedValue({
      id: 'evidence-1',
      participationId: 'participation-1',
    });

    const response = await controller.recordFieldParticipationEvidence(
      TEST_USER_PRINCIPAL,
      { participationId: 'participation-1' },
      {
        fieldVotingSessionId: 'session-1',
        verifiedByCommissionMemberId: 'member-1',
        evidenceFileId: 'file-1',
        verificationNote: 'signature checked',
        verifiedAt: '2026-08-20T01:10:00.000Z',
      },
    );

    expect(response).toEqual({
      id: 'evidence-1',
      participationId: 'participation-1',
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toMatchObject({
      participationId: 'participation-1',
      fieldVotingSessionId: 'session-1',
      verifiedByCommissionMemberId: 'member-1',
      evidenceFileId: 'file-1',
      verificationNote: 'signature checked',
      verifiedAt: new Date('2026-08-20T01:10:00.000Z'),
    });
  });
});
