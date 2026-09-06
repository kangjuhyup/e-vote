import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  type AttachmentType,
  type AttachmentUploadMetadata,
} from '../model/vote-attachment.types';

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedMimeTypes = new Set<string>(ALLOWED_ATTACHMENT_MIME_TYPES);

export function validateAttachmentMetadata<TType extends AttachmentType>(
  metadata: AttachmentUploadMetadata<TType>,
): string | undefined {
  if (!metadata.originalName.trim()) {
    return '파일 이름이 있는 파일을 선택하세요.';
  }
  if (metadata.originalName.length > 255) {
    return '파일 이름은 255자 이하여야 합니다.';
  }
  if (metadata.sizeBytes < 1) {
    return '빈 파일은 등록할 수 없습니다.';
  }
  if (metadata.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    return '파일 크기는 20MB 이하여야 합니다.';
  }
  if (!metadata.mimeType || !allowedMimeTypes.has(metadata.mimeType)) {
    return 'PDF, 이미지, 문서, 스프레드시트, 프레젠테이션 또는 텍스트 파일만 등록할 수 있습니다.';
  }
  if (
    metadata.attachmentType === 'PROFILE_IMAGE' &&
    !IMAGE_MIME_TYPES.has(metadata.mimeType)
  ) {
    return '후보자 프로필 이미지는 JPG, PNG 또는 WebP 파일을 선택하세요.';
  }
  if (metadata.sortOrder !== undefined && metadata.sortOrder < 0) {
    return '첨부 순서는 0 이상이어야 합니다.';
  }
  return undefined;
}

export function attachmentMetadataFromFile<TType extends AttachmentType>(
  file: File,
  attachmentType: TType,
  sortOrder = 0,
): AttachmentUploadMetadata<TType> {
  return {
    attachmentType,
    originalName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    sortOrder,
  };
}
