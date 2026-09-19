"use client";

import type { AttachmentType } from "@/features/votes/model/vote-attachment.types";
import {
  AttachmentUploadSection,
  type AttachmentUploadSectionProps,
} from "@/features/votes/ui/attachment-upload-section";

import { useAttachmentUpload } from "../hooks/use-attachment-upload";

export function AttachmentUploadContainer<TType extends AttachmentType>(
  props: AttachmentUploadSectionProps<TType>,
) {
  const control = useAttachmentUpload(props);
  return <AttachmentUploadSection {...props} control={control} />;
}
