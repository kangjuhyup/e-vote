import { GetParticipationReminderTemplateQuery } from '../../../../src/modules/vote/application/query/dto/request/get-participation-reminder-template.query';
import { GetParticipationReminderTemplateHandler } from '../../../../src/modules/vote/application/query/handler/get-participation-reminder-template.handler';

describe('GetParticipationReminderTemplateHandler', () => {
  it('returns the fixed server template', () => {
    const result = new GetParticipationReminderTemplateHandler().execute(
      GetParticipationReminderTemplateQuery.of({ voteId: 'vote-1' }),
    );

    expect(result).toEqual({
      code: 'VOTE_PARTICIPATION_REMINDER',
      content:
        '[전자투표]\n아직 투표에 참여하지 않으셨습니다.\n아래 버튼을 눌러 투표에 참여해 주세요.',
      buttonLabel: '투표 참여하기',
    });
  });
});
