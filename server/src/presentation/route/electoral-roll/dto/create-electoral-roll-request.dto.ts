import { ApiProperty } from '@nestjs/swagger';

export class CreateElectoralRollBody {
  @ApiProperty({ example: 'commission-1' })
  readonly commissionId!: string;

  @ApiProperty({ example: '2026 annual member roll' })
  readonly name!: string;
}
