import { ApiProperty } from '@nestjs/swagger';

type ParticipationReminderTemplateSource = {
  readonly code: string;
  readonly content: string;
  readonly buttonLabel: string;
};

export class GetParticipationReminderTemplateResponse {
  @ApiProperty() readonly code: string;
  @ApiProperty() readonly content: string;
  @ApiProperty() readonly buttonLabel: string;

  private constructor(source: ParticipationReminderTemplateSource) {
    this.code = source.code;
    this.content = source.content;
    this.buttonLabel = source.buttonLabel;
  }

  static of(source: ParticipationReminderTemplateSource) {
    return new GetParticipationReminderTemplateResponse(source);
  }
}
