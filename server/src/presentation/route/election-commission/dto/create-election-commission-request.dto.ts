import { ApiProperty } from '@nestjs/swagger';

export class CreateElectionCommissionBody {
  @ApiProperty({
    example: 'Main Commission',
    minLength: 1,
    maxLength: 100,
    description: '생성할 선거관리위원회 이름입니다.',
  })
  readonly name!: string;
}
