import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DevelopmentParticipationLinkParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly voteId!: string;

  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly electorId!: string;
}

export class DevelopmentParticipationLinkResponse {
  @ApiProperty({ format: 'uuid' })
  readonly electorId: string;

  @ApiProperty({
    format: 'uri',
    description:
      '개발 및 테스트 환경에서만 반환되는 현재 선거인 참여 URL입니다.',
  })
  readonly participationUrl: string;

  private constructor(params: DevelopmentParticipationLinkResponse) {
    this.electorId = params.electorId;
    this.participationUrl = params.participationUrl;
  }

  static of(
    params: DevelopmentParticipationLinkResponse,
  ): DevelopmentParticipationLinkResponse {
    return new DevelopmentParticipationLinkResponse(params);
  }
}
