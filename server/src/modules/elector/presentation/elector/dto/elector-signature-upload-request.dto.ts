import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const ELECTOR_SIGNATURE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
const ELECTOR_SIGNATURE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export class ElectorSignatureParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid', description: '투표 ID입니다.' })
  readonly voteId!: string;

  @IsUUID()
  @ApiProperty({ format: 'uuid', description: '서명할 선거인 ID입니다.' })
  readonly electorId!: string;
}

export class RequestElectorSignatureUploadBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({ example: 'signature.png', maxLength: 255 })
  readonly originalName!: string;

  @IsIn(ELECTOR_SIGNATURE_MIME_TYPES)
  @ApiProperty({
    enum: ELECTOR_SIGNATURE_MIME_TYPES,
    example: 'image/png',
  })
  readonly mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(ELECTOR_SIGNATURE_MAX_SIZE_BYTES)
  @ApiProperty({ minimum: 1, maximum: ELECTOR_SIGNATURE_MAX_SIZE_BYTES })
  readonly sizeBytes!: number;
}

export class ConfirmElectorSignatureUploadBody extends RequestElectorSignatureUploadBody {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: '업로드 URL 요청에서 발급받은 키입니다.' })
  readonly storageKey!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, description: '선택적 파일 체크섬입니다.' })
  readonly checksum?: string;
}
