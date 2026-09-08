import { ApiProperty } from '@nestjs/swagger';
import type { ParticipationReminderTemplateView } from '../../../application/query/dto/response/participation-reminder-template.view';

export class GetParticipationReminderTemplateResponse {
  @ApiProperty() readonly code: string;
  @ApiProperty() readonly content: string;
  @ApiProperty() readonly buttonLabel: string;

  private constructor(source: ParticipationReminderTemplateView) {
    this.code = source.code;
    this.content = source.content;
    this.buttonLabel = source.buttonLabel;
  }

  static of(source: ParticipationReminderTemplateView) {
    return new GetParticipationReminderTemplateResponse(source);
  }
}
