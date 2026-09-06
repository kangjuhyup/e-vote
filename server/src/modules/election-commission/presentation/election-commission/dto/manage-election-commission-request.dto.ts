import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';
export class ManageElectionCommissionParam {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  readonly commissionId!: string;
}
export class ManageElectionCommissionMemberParam extends ManageElectionCommissionParam {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  readonly memberId!: string;
}
export class UpdateElectionCommissionMemberBody {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(1, 100)
  @Matches(/\S/)
  readonly name?: string;
  @ApiPropertyOptional({ enum: ['ADMIN', 'FIELD_MANAGER'] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['ADMIN', 'FIELD_MANAGER'])
  readonly role?: 'ADMIN' | 'FIELD_MANAGER';
}
