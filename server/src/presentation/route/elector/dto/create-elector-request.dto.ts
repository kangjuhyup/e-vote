import { ApiProperty } from '@nestjs/swagger';

export class CreateElectorBody {
  @ApiProperty({
    example: 'Kim Min Su',
    minLength: 1,
    maxLength: 200,
    description: '선거인 이름입니다. 저장 경계에서 암호화됩니다.',
  })
  readonly name!: string;

  @ApiProperty({
    example: 'member-1',
    minLength: 1,
    maxLength: 200,
    description:
      '선거인 식별자입니다. 원본 민감 식별값이 아닌 업무 식별자를 사용합니다.',
  })
  readonly identifier!: string;

  @ApiProperty({
    required: false,
    example: '010-1234-5678',
    minLength: 1,
    maxLength: 50,
    description: '선거인 휴대폰번호입니다. 저장 경계에서 암호화됩니다.',
  })
  readonly phoneNumber?: string;

  @ApiProperty({
    required: false,
    example: '1990-01-31',
    minLength: 1,
    maxLength: 20,
    description: '선거인 생년월일입니다. 저장 경계에서 암호화됩니다.',
  })
  readonly birthDate?: string;

  @ApiProperty({
    required: false,
    example: 'group-1',
    minLength: 1,
    maxLength: 200,
    description: '그룹 투표에서 사용하는 그룹 키입니다. 없으면 생략합니다.',
  })
  readonly groupKey?: string;

  @ApiProperty({
    required: false,
    example: 1,
    minimum: 1,
    description: '지분 투표에서 사용할 선거인 가중치입니다. 생략하면 1입니다.',
  })
  readonly voteWeight?: number;
}

export class CreateElectorParam {
  @ApiProperty({
    example: 'vote-1',
    description: '선거인을 등록할 부모 투표 ID입니다.',
  })
  readonly voteId!: string;
}
