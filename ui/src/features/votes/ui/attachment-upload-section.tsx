'use client';

import { Download, FileUp, Paperclip, RotateCcw, Trash2, X } from 'lucide-react';
import { useId } from 'react';

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

export interface AttachmentTypeOption<TType extends AttachmentType> {
  label: string;
  value: TType;
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

export type UploadStage =
  | 'idle'
  | 'requesting'
  | 'uploading'
  | 'confirming'
  | 'request-failed'
  | 'upload-failed'
  | 'confirm-failed';

export interface AttachmentUploadControl<TType extends AttachmentType> {
  attachmentType: TType;
  changeFile: (file?: File) => void;
  changeType: (type: TType) => void;
  confirm: (grant: AttachmentUploadGrant<TType>, file: File) => Promise<void>;
  deleteConfirmationId?: string;
  deletingId?: string;
  download: (attachmentId: string) => Promise<void>;
  downloadingId?: string;
  errorMessage?: string;
  file?: File;
  fileInputKey: number;
  isBusy: boolean;
  pending?: { file: File; grant: AttachmentUploadGrant<TType> };
  remove: (attachmentId: string) => Promise<void>;
  setDeleteConfirmationId: (id?: string) => void;
  stage: UploadStage;
  upload: (file: File, type: TType) => Promise<void>;
}

type AttachmentUploadViewProps<TType extends AttachmentType> = Omit<
  AttachmentUploadSectionProps<TType>,
  | 'onConfirmUpload'
  | 'onDeleteAttachment'
  | 'onDownloadAttachment'
  | 'onRequestUpload'
  | 'onUploadObject'
> & {
  control: AttachmentUploadControl<TType>;
};

export function AttachmentUploadSection<TType extends AttachmentType>({
  attachments,
  description,
  disabled = false,
  disabledMessage = '투표가 잠겨 첨부파일을 등록할 수 없습니다.',
  control,
  readOnly = false,
  title,
  typeOptions,
}: AttachmentUploadViewProps<TType>) {
  const inputId = useId();
  const {
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
  } = control;

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
                onChange={(event) => changeType(event.target.value as TType)}
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
                onChange={(event) => changeFile(event.target.files?.[0])}
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

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
