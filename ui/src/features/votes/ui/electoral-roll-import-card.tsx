"use client";

import { Download, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  ElectoralRollImportMemberInput,
  ElectoralRollWorkbookParseResult,
  StageElectoralRollMembersResult,
} from "@/features/votes/model/electoral-roll.types";

export interface ElectoralRollImportCardProps {
  isSubmitting: boolean;
  mode?: 'create' | 'manage';
  onImportMembers: (
    members: ElectoralRollImportMemberInput[],
  ) => Promise<StageElectoralRollMembersResult>;
}

export interface ElectoralRollImportControl {
  actionError?: string;
  canImport: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  fileName: string;
  handleDownload: () => Promise<void>;
  handleFileChange: (file?: File) => Promise<void>;
  handleImport: () => Promise<void>;
  importResult?: StageElectoralRollMembersResult;
  isBusy: boolean;
  isDownloading: boolean;
  isParsing: boolean;
  parseResult?: ElectoralRollWorkbookParseResult;
}

export function ElectoralRollImportCard({
  mode = 'manage',
  control,
}: Pick<ElectoralRollImportCardProps, 'mode'> & {
  control: ElectoralRollImportControl;
}) {
  const {
    actionError,
    canImport,
    fileInputRef,
    fileName,
    handleDownload,
    handleFileChange,
    handleImport,
    importResult,
    isBusy,
    isDownloading,
    isParsing,
    parseResult,
  } = control;

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex items-start gap-3">
          <FileSpreadsheet
            className="mt-0.5 size-5 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <CardTitle className="text-base">엑셀로 일괄 등록</CardTitle>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              템플릿을 내려받아 작성한 뒤 업로드하세요.{' '}
              {mode === 'manage'
                ? '기존 구성원은 유지되고 새 구성원만 추가됩니다. '
                : '파일을 검증한 뒤 생성할 명부의 구성원으로 추가합니다. '}
              이름·휴대폰번호·생년월일은 선택 항목이며, 본인인증 투표에
              사용할 때는 이름과 휴대폰번호를 모두 입력해야 합니다.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-end">
          <Button
            type="button"
            variant="outline"
            disabled={isDownloading || isBusy}
            onClick={handleDownload}
          >
            {isDownloading ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Download aria-hidden="true" />
            )}
            템플릿 다운로드
          </Button>
          <label className="grid gap-2 text-sm font-medium">
            작성한 엑셀 파일
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={isParsing || isBusy}
              onChange={(event) => handleFileChange(event.target.files?.[0])}
            />
          </label>
          <Button
            type="button"
            disabled={!canImport}
            onClick={handleImport}
          >
            {isBusy ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Upload aria-hidden="true" />
            )}
            {isBusy
              ? "추가 중…"
              : mode === 'manage'
                ? "검증한 구성원 초안 추가"
                : "검증한 구성원 추가"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          .xlsx · 최대 5MB · 한 번에 최대 5,000명 · 빈 가중치는 1 ·
          이름과 휴대폰번호는 함께 입력
        </p>

        {isParsing ? (
          <p role="status" className="text-sm text-muted-foreground">
            {fileName} 파일을 확인하는 중…
          </p>
        ) : null}

        {parseResult && parseResult.errors.length === 0 ? (
          <div
            role="status"
            className="rounded-md border border-emerald-600/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
          >
            <p className="font-medium">
              {parseResult.members.length.toLocaleString()}명 등록 준비 완료
            </p>
            <p className="mt-1 text-xs opacity-80">
              {mode === 'manage'
                ? '파일 내용을 확인했습니다. 초안에 추가한 뒤 선거인명부 저장 버튼으로 반영하세요.'
                : '파일 내용을 확인했습니다. 구성원으로 추가한 뒤 생성 전 검토할 수 있습니다.'}
            </p>
          </div>
        ) : null}

        {parseResult && parseResult.errors.length > 0 ? (
          <ErrorList
            title={`${parseResult.errors.length.toLocaleString()}개 항목을 수정하세요.`}
            errors={parseResult.errors.map((error) =>
              error.rowNumber
                ? `${error.rowNumber}행: ${error.message}`
                : error.message,
            )}
          />
        ) : null}

        {parseResult && isBusy ? (
          <div className="space-y-2" role="status" aria-live="polite">
            <p className="text-sm">
              구성원 {parseResult.members.length.toLocaleString()}명을 저장 대기
              목록에 추가하는 중입니다.
            </p>
            <div
              role="progressbar"
              aria-label="구성원 초안 추가 중"
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
          </div>
        ) : null}

        {importResult ? (
          <p
            role="status"
            className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground"
          >
            구성원 {importResult.stagedMemberCount.toLocaleString()}명을 저장 대기
            목록에 추가했습니다.
          </p>
        ) : null}

        {actionError ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {actionError}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ErrorList({ title, errors }: { title: string; errors: string[] }) {
  const visibleErrors = errors.slice(0, 10);
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <p className="font-medium">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
        {visibleErrors.map((error, index) => (
          <li key={`${index}-${error}`}>{error}</li>
        ))}
      </ul>
      {errors.length > visibleErrors.length ? (
        <p className="mt-2 text-xs">
          외 {(errors.length - visibleErrors.length).toLocaleString()}개 오류
        </p>
      ) : null}
    </div>
  );
}
