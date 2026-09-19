"use client";

import { useState } from "react";

import {
  attachmentMetadataFromFile,
  validateAttachmentMetadata,
} from "@/features/votes/lib/vote-attachment";
import type {
  AttachmentType,
  AttachmentUploadGrant,
} from "@/features/votes/model/vote-attachment.types";
import type {
  AttachmentUploadControl,
  AttachmentUploadSectionProps,
} from "@/features/votes/ui/attachment-upload-section";

type UploadCallbacks<TType extends AttachmentType> = Pick<
  AttachmentUploadSectionProps<TType>,
  | "onConfirmUpload"
  | "onDeleteAttachment"
  | "onDownloadAttachment"
  | "onRequestUpload"
  | "onUploadObject"
  | "typeOptions"
>;

export function useAttachmentUpload<TType extends AttachmentType>({
  onConfirmUpload,
  onDeleteAttachment,
  onDownloadAttachment,
  onRequestUpload,
  onUploadObject,
  typeOptions,
}: UploadCallbacks<TType>): AttachmentUploadControl<TType> {
  const [attachmentType, setAttachmentType] = useState<TType>(
    typeOptions[0].value,
  );
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string>();
  const [deletingId, setDeletingId] = useState<string>();
  const [downloadingId, setDownloadingId] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [file, setFile] = useState<File>();
  const [fileInputKey, setFileInputKey] = useState(0);
  const [pending, setPending] = useState<{
    file: File;
    grant: AttachmentUploadGrant<TType>;
  }>();
  const [stage, setStage] = useState<AttachmentUploadControl<TType>["stage"]>(
    "idle",
  );
  const isBusy =
    stage === "requesting" ||
    stage === "uploading" ||
    stage === "confirming";

  async function confirm(grant: AttachmentUploadGrant<TType>, source: File) {
    setStage("confirming");
    setErrorMessage(undefined);
    try {
      await onConfirmUpload({ ...grant.metadata, storageKey: grant.storageKey });
      setPending(undefined);
      setFile(undefined);
      setFileInputKey((value) => value + 1);
      setStage("idle");
    } catch (error) {
      setPending({ file: source, grant });
      setStage("confirm-failed");
      setErrorMessage(toErrorMessage(error));
    }
  }

  async function upload(source: File, type: TType) {
    const metadata = attachmentMetadataFromFile(source, type);
    const validationError = validateAttachmentMetadata(metadata);
    if (validationError) {
      setErrorMessage(validationError);
      setStage("idle");
      return;
    }

    setErrorMessage(undefined);
    setPending(undefined);
    setStage("requesting");
    let grant: AttachmentUploadGrant<TType>;
    try {
      grant = await onRequestUpload(metadata);
    } catch (error) {
      setStage("request-failed");
      setErrorMessage(toErrorMessage(error));
      return;
    }

    setStage("uploading");
    try {
      await onUploadObject(grant, source);
    } catch (error) {
      setStage("upload-failed");
      setErrorMessage(toErrorMessage(error));
      return;
    }

    setPending({ file: source, grant });
    await confirm(grant, source);
  }

  async function download(attachmentId: string) {
    setDownloadingId(attachmentId);
    setErrorMessage(undefined);
    try {
      const grant = await onDownloadAttachment(attachmentId);
      if (grant.attachmentId !== attachmentId || !grant.downloadUrl) {
        throw new Error("다운로드 URL 응답이 올바르지 않습니다.");
      }
      const anchor = document.createElement("a");
      anchor.href = grant.downloadUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.click();
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setDownloadingId(undefined);
    }
  }

  async function remove(attachmentId: string) {
    setDeletingId(attachmentId);
    setErrorMessage(undefined);
    try {
      await onDeleteAttachment(attachmentId);
      setDeleteConfirmationId(undefined);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setDeletingId(undefined);
    }
  }

  function changeType(type: TType) {
    setAttachmentType(type);
    setPending(undefined);
    setStage("idle");
    setErrorMessage(undefined);
  }

  function changeFile(nextFile?: File) {
    setFile(nextFile);
    setPending(undefined);
    setStage("idle");
    setErrorMessage(undefined);
  }

  return {
    attachmentType,
    changeFile,
    changeType,
    confirm,
    deleteConfirmationId,
    deletingId,
    download,
    downloadingId,
    errorMessage,
    file,
    fileInputKey,
    isBusy,
    pending,
    remove,
    setDeleteConfirmationId,
    stage,
    upload,
  };
}

function toErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "파일을 등록하지 못했습니다. 잠시 후 다시 시도하세요.";
}
