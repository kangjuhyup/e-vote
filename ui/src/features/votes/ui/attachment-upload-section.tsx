'use client';

import { CheckCircle2, FileUp, RotateCcw } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  type AttachmentType,
  type AttachmentUploadGrant,
  type AttachmentUploadMetadata,
  type AttachmentUploadResult,
  type ConfirmedAttachmentUpload,
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
  description: string;
  disabled?: boolean;
  disabledMessage?: string;
  onConfirmUpload: (
    input: AttachmentUploadMetadata<TType> & { storageKey: string },
  ) => Promise<AttachmentUploadResult>;
  onRequestUpload: (
    metadata: AttachmentUploadMetadata<TType>,
  ) => Promise<AttachmentUploadGrant<TType>>;
  onUploadObject: (
    grant: AttachmentUploadGrant<TType>,
    file: File,
  ) => Promise<void>;
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
  description,
  disabled = false,
  disabledMessage = '투표가 잠겨 첨부파일을 등록할 수 없습니다.',
  onConfirmUpload,
  onRequestUpload,
  onUploadObject,
  title,
  typeOptions,
}: AttachmentUploadSectionProps<TType>) {
  const inputId = useId();
  const [attachmentType, setAttachmentType] = useState<TType>(
    typeOptions[0].value,
  );
  const [confirmed, setConfirmed] = useState<
    ConfirmedAttachmentUpload<TType>[]
  >([]);
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
      const result = await onConfirmUpload({
        ...grant.metadata,
        storageKey: grant.storageKey,
      });
      setConfirmed((items) => [
        ...items,
        {
          ...result,
          attachmentType: grant.metadata.attachmentType,
          mimeType: grant.metadata.mimeType,
          originalName: grant.metadata.originalName,
          sizeBytes: grant.metadata.sizeBytes,
        },
      ]);
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

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileUp className="size-5 text-muted-foreground" aria-hidden="true" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {disabled ? (
          <p className="rounded-md border bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
            {disabledMessage}
          </p>
        ) : null}
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

        {confirmed.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">현재 화면에서 등록한 파일</h3>
            <ul className="divide-y rounded-md border">
              {confirmed.map((item) => (
                <li
                  key={item.attachmentId}
                  className="flex items-center gap-3 px-3 py-3 text-sm"
                >
                  <CheckCircle2
                    className="size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {item.originalName}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatFileSize(item.sizeBytes)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              서버의 첨부 조회 기능이 제공되기 전까지 이 목록은 현재
              화면에서만 확인할 수 있습니다.
            </p>
          </div>
        ) : null}
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
