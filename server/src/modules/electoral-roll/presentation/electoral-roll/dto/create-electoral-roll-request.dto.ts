import { ApiProperty } from '@nestjs/swagger';

export class CreateElectoralRollBody {
  @ApiProperty({ example: '2026 annual member roll' })
  readonly name!: string;
}
