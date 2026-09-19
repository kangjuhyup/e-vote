import { Injectable } from '@nestjs/common';
import {
  UPCOMING_VOTE_NOTICE_TEMPLATE,
  VOTE_RESULT_NOTICE_TEMPLATE,
} from '../../../../../shared/application/sms/vote-notice-templates';
import { SmsMessagePurpose } from '../../../../../shared/domain/voting/type/sms-message-purpose.type';

@Injectable()
export class GetVoteNoticeTemplateHandler {
  execute(
    purpose:
      | typeof SmsMessagePurpose.UpcomingVoteNotice
      | typeof SmsMessagePurpose.VoteResultNotice,
  ) {
    return purpose === SmsMessagePurpose.UpcomingVoteNotice
      ? UPCOMING_VOTE_NOTICE_TEMPLATE
      : VOTE_RESULT_NOTICE_TEMPLATE;
  }
}
