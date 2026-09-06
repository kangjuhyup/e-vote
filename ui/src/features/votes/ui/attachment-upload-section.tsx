'use client';

import { Download, FileUp, Paperclip, RotateCcw, Trash2, X } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  type AttachmentDownloadGrant,
  type AttachmentRecord,
  type AttachmentType,
  type AttachmentUploadGrant,
  type AttachmentUploadMetadata,
  type AttachmentUploadResult,
} from '@/features/votes/model/vote-attachment.types';
import {
  attachmentMetadataFromFile,
  validateAttachmentMetadata,
} from '@/features/votes/lib/vote-attachment';

export interface AttachmentTypeOption<TType extends AttachmentType> {
  label: string;
  value: TType;
}

interface PendingUpload<TType extends AttachmentType> {
  file: File;
  grant: AttachmentUploadGrant<TType>;
}

export interface AttachmentUploadSectionProps<TType extends AttachmentType> {
  attachments: AttachmentRecord<TType>[];
  description: string;
  disabled?: boolean;
  disabledMessage?: string;
  onConfirmUpload: (
    input: AttachmentUploadMetadata<TType> & { storageKey: string },
  ) => Promise<AttachmentUploadResult>;
  onDeleteAttachment: (attachmentId: string) => Promise<void>;
  onDownloadAttachment: (
    attachmentId: string,
  ) => Promise<AttachmentDownloadGrant>;
  onRequestUpload: (
    metadata: AttachmentUploadMetadata<TType>,
  ) => Promise<AttachmentUploadGrant<TType>>;
  onUploadObject: (
    grant: AttachmentUploadGrant<TType>,
    file: File,
  ) => Promise<void>;
  readOnly?: boolean;
  title: string;
  typeOptions: AttachmentTypeOption<TType>[];
}

type UploadStage =
  | 'idle'
  | 'requesting'
  | 'uploading'
  | 'confirming'
  | 'request-failed'
  | 'upload-failed'
  | 'confirm-failed';

export function AttachmentUploadSection<TType extends AttachmentType>({
  attachments,
  description,
  disabled = false,
  disabledMessage = '투표가 잠겨 첨부파일을 등록할 수 없습니다.',
  onConfirmUpload,
  onDeleteAttachment,
  onDownloadAttachment,
  onRequestUpload,
  onUploadObject,
  readOnly = false,
  title,
  typeOptions,
}: AttachmentUploadSectionProps<TType>) {
  const inputId = useId();
  const [attachmentType, setAttachmentType] = useState<TType>(
    typeOptions[0].value,
  );
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string>();
  const [deletingId, setDeletingId] = useState<string>();
  const [downloadingId, setDownloadingId] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [file, setFile] = useState<File>();
  const [fileInputKey, setFileInputKey] = useState(0);
  const [pending, setPending] = useState<PendingUpload<TType>>();
  const [stage, setStage] = useState<UploadStage>('idle');
  const isBusy =
    stage === 'requesting' ||
    stage === 'uploading' ||
    stage === 'confirming';

  async function confirm(grant: AttachmentUploadGrant<TType>, source: File) {
    setStage('confirming');
    setErrorMessage(undefined);
    try {
      await onConfirmUpload({
        ...grant.metadata,
        storageKey: grant.storageKey,
      });
      setPending(undefined);
      setFile(undefined);
      setFileInputKey((value) => value + 1);
      setStage('idle');
    } catch (error) {
      setPending({ file: source, grant });
      setStage('confirm-failed');
      setErrorMessage(toErrorMessage(error));
    }
  }

  async function upload(source: File, type: TType) {
    const metadata = attachmentMetadataFromFile(source, type);
    const validationError = validateAttachmentMetadata(metadata);
    if (validationError) {
      setErrorMessage(validationError);
      setStage('idle');
      return;
    }

    setErrorMessage(undefined);
    setPending(undefined);
    setStage('requesting');
    let grant: AttachmentUploadGrant<TType>;
    try {
      grant = await onRequestUpload(metadata);
    } catch (error) {
      setStage('request-failed');
      setErrorMessage(toErrorMessage(error));
      return;
    }

    setStage('uploading');
    try {
      await onUploadObject(grant, source);
    } catch (error) {
      setStage('upload-failed');
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
        throw new Error('다운로드 URL 응답이 올바르지 않습니다.');
      }
      const anchor = document.createElement('a');
      anchor.href = grant.downloadUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
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

  const orderedAttachments = [...attachments].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.createdAt.localeCompare(right.createdAt),
  );

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {readOnly ? (
            <Paperclip
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
          ) : (
            <FileUp
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
          )}
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!readOnly && disabled ? (
          <p className="rounded-md border bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
            {disabledMessage}
          </p>
        ) : null}
        {!readOnly ? (
          <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
            <label className="grid gap-2 text-sm font-medium">
              첨부 유형
              <Select
                value={attachmentType}
                disabled={disabled || isBusy}
                onChange={(event) => {
                  setAttachmentType(event.target.value as TType);
                  setPending(undefined);
                  setStage('idle');
                  setErrorMessage(undefined);
                }}
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
            <label htmlFor={inputId} className="grid gap-2 text-sm font-medium">
              파일
              <Input
                key={fileInputKey}
                id={inputId}
                type="file"
                accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(',')}
                disabled={disabled || isBusy}
                onChange={(event) => {
                  setFile(event.target.files?.[0]);
                  setPending(undefined);
                  setStage('idle');
                  setErrorMessage(undefined);
                }}
              />
            </label>
            <Button
              type="button"
              disabled={disabled || isBusy || !file}
              onClick={() => {
                if (file) void upload(file, attachmentType);
              }}
            >
              <FileUp aria-hidden="true" />
              {stageLabel(stage)}
            </Button>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="space-y-3">
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {errorMessage}
            </p>
            {stage === 'confirm-failed' && pending ? (
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => void confirm(pending.grant, pending.file)}
              >
                <RotateCcw aria-hidden="true" />
                등록 확정 다시 시도
              </Button>
            ) : stage === 'upload-failed' && file ? (
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => void upload(file, attachmentType)}
              >
                <RotateCcw aria-hidden="true" />
                업로드 URL 다시 받아 재시도
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">등록된 첨부파일</h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              {orderedAttachments.length.toLocaleString()}개
            </span>
          </div>
          {orderedAttachments.length > 0 ? (
            <ul className="divide-y rounded-md border">
              {orderedAttachments.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 px-3 py-3 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {item.originalName}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {typeOptions.find((option) => option.value === item.type)
                        ?.label ?? item.type}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatFileSize(item.sizeBytes)}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={downloadingId === item.id}
                      aria-label={`${item.originalName} 다운로드`}
                      onClick={() => void download(item.id)}
                    >
                      <Download aria-hidden="true" />
                      {downloadingId === item.id ? '준비 중…' : '다운로드'}
                    </Button>
                    {!readOnly && deleteConfirmationId === item.id ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={deletingId === item.id}
                          aria-label={`${item.originalName} 삭제 취소`}
                          onClick={() => setDeleteConfirmationId(undefined)}
                        >
                          <X aria-hidden="true" />
                          취소
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={disabled || deletingId === item.id}
                          aria-label={`${item.originalName} 삭제 확인`}
                          onClick={() => void remove(item.id)}
                        >
                          <Trash2 aria-hidden="true" />
                          {deletingId === item.id ? '삭제 중…' : '삭제 확인'}
                        </Button>
                      </>
                    ) : !readOnly ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={disabled}
                        aria-label={`${item.originalName} 삭제`}
                        onClick={() => setDeleteConfirmationId(item.id)}
                      >
                        <Trash2 aria-hidden="true" />
                        삭제
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              등록된 첨부파일이 없습니다.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function stageLabel(stage: UploadStage) {
  if (stage === 'requesting') return '업로드 준비 중…';
  if (stage === 'uploading') return '파일 전송 중…';
  if (stage === 'confirming') return '등록 확정 중…';
  return '첨부 등록';
}

function toErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : '파일을 등록하지 못했습니다. 잠시 후 다시 시도하세요.';
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
