import { GetVoteNoticeTemplateHandler } from '../../../../src/modules/vote/application/query/handler/get-vote-notice-template.handler';
import { SmsMessagePurpose } from '../../../../src/shared/domain/voting/type/sms-message-purpose.type';

describe('Vote notice templates', () => {
  it.each([
    [SmsMessagePurpose.UpcomingVoteNotice, '곧 투표가 시작됩니다.'],
    [SmsMessagePurpose.VoteResultNotice, '투표가 종료되었습니다.'],
  ] as const)('returns the fixed %s preview', (purpose, expectedContent) => {
    const template = new GetVoteNoticeTemplateHandler().execute(purpose);

    expect(template.code).toBe(purpose);
    expect(template.content).toContain(expectedContent);
  });
});
