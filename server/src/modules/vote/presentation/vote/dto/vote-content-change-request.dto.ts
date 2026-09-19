import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

type VoteContentAttachmentChange =
  | { action: 'ADD'; fileId: string }
  | { action: 'REMOVE'; attachmentId: string };
type VoteContentChangeFileKind =
  'DOCUMENT' | 'VOTE_ATTACHMENT' | 'CANDIDATE_ATTACHMENT';

export class RequestVoteContentChangeFileUploadBody {
  @ApiProperty({
    enum: ['DOCUMENT', 'VOTE_ATTACHMENT', 'CANDIDATE_ATTACHMENT'],
  })
  @IsIn(['DOCUMENT', 'VOTE_ATTACHMENT', 'CANDIDATE_ATTACHMENT'])
  kind!: VoteContentChangeFileKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attachmentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  sizeBytes!: number;
}

export class SubmitVoteContentChangeBody {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;

  @ApiProperty()
  @IsUUID()
  documentFileId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  endedAt?: string;

  @ApiProperty({ type: Array, default: [] })
  @IsArray()
  attachmentChanges!: VoteContentAttachmentChange[];
}

export class RejectVoteContentChangeBody {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}
