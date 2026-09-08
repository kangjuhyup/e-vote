import { Injectable } from '@nestjs/common';
import { PARTICIPATION_REMINDER_TEMPLATE } from '../../../../../shared/application/sms/participation-reminder-template';
import type { GetParticipationReminderTemplateQuery } from '../dto/request/get-participation-reminder-template.query';
import { ParticipationReminderTemplateView } from '../dto/response/participation-reminder-template.view';

@Injectable()
export class GetParticipationReminderTemplateHandler {
  execute(
    query: GetParticipationReminderTemplateQuery,
  ): ParticipationReminderTemplateView {
    void query.voteId;
    return ParticipationReminderTemplateView.of(
      PARTICIPATION_REMINDER_TEMPLATE,
    );
  }
}
