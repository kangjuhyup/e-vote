import { ApiProperty } from '@nestjs/swagger';

export class AuthenticateElectorResponse {
  @ApiProperty({
    example: 'elector-1',
    description: '본인인증된 선거인 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: 'vote-1',
    description: '선거인이 속한 부모 투표 ID입니다.',
  })
  readonly voteId: string;

  @ApiProperty({
    example: true,
    description: '선거인 본인인증 완료 여부입니다.',
  })
  readonly identityVerified: boolean;

  private constructor(id: string, voteId: string, identityVerified: boolean) {
    this.id = id;
    this.voteId = voteId;
    this.identityVerified = identityVerified;
  }

  static of(result: {
    readonly id: string;
    readonly voteId: string;
    readonly identityVerified: boolean;
  }): AuthenticateElectorResponse {
    return new AuthenticateElectorResponse(
      result.id,
      result.voteId,
      result.identityVerified,
    );
  }
}
