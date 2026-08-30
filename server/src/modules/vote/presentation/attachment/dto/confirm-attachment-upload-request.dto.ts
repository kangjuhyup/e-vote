import { ApiProperty } from '@nestjs/swagger';

const AttachmentTypeBody = {
  Notice: 'NOTICE',
  Guide: 'GUIDE',
  ProfileImage: 'PROFILE_IMAGE',
  Pledge: 'PLEDGE',
  Poster: 'POSTER',
  Etc: 'ETC',
} as const;

type AttachmentTypeBody =
  (typeof AttachmentTypeBody)[keyof typeof AttachmentTypeBody];

export class ConfirmAttachmentUploadBody {
  @ApiProperty({
    example: 'attachments/opaque-storage-key',
    description: '업로드 주소 요청에서 발급받은 스토리지 키입니다.',
  })
  readonly storageKey!: string;

  @ApiProperty({
    enum: Object.values(AttachmentTypeBody),
    example: AttachmentTypeBody.Notice,
    description: '첨부파일 유형입니다.',
  })
  readonly attachmentType!: AttachmentTypeBody;

  @ApiProperty({
    example: 'notice.pdf',
    minLength: 1,
    maxLength: 255,
    description: '사용자에게 표시할 원본 파일명입니다.',
  })
  readonly originalName!: string;

  @ApiProperty({
    example: 'application/pdf',
    description: '업로드한 파일 MIME 타입입니다.',
  })
  readonly mimeType!: string;

  @ApiProperty({
    example: 1024,
    minimum: 1,
    description: '업로드한 파일 크기입니다.',
  })
  readonly sizeBytes!: number;

  @ApiProperty({
    required: false,
    example: 'sha256:abc123',
    description: '클라이언트가 계산한 파일 체크섬입니다.',
  })
  readonly checksum?: string;

  @ApiProperty({
    required: false,
    example: 0,
    minimum: 0,
    description: '첨부파일 정렬 순서입니다. 생략하면 0입니다.',
  })
  readonly sortOrder?: number;
}
