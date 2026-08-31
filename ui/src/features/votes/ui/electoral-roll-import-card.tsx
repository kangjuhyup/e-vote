"use client";

import { Download, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  downloadElectoralRollTemplate,
  parseElectoralRollWorkbook,
} from "@/features/votes/lib/electoral-roll-workbook";
import type {
  ElectoralRollImportMemberInput,
  ElectoralRollWorkbookParseResult,
  StageElectoralRollMembersResult,
} from "@/features/votes/model/electoral-roll.types";

interface ElectoralRollImportCardProps {
  isSubmitting: boolean;
  onImportMembers: (
    members: ElectoralRollImportMemberInput[],
  ) => Promise<StageElectoralRollMembersResult>;
}

export function ElectoralRollImportCard({
  isSubmitting,
  onImportMembers,
}: ElectoralRollImportCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] =
    useState<ElectoralRollWorkbookParseResult>();
  const [importResult, setImportResult] =
    useState<StageElectoralRollMembersResult>();
  const [actionError, setActionError] = useState<string>();

  async function handleDownload() {
    setActionError(undefined);
    setIsDownloading(true);
    try {
      await downloadElectoralRollTemplate();
    } catch {
      setActionError("템플릿을 내려받지 못했습니다. 다시 시도하세요.");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleFileChange(file?: File) {
    setImportResult(undefined);
    setActionError(undefined);
    setParseResult(undefined);
    setFileName(file?.name ?? "");
    if (!file) return;

    setIsParsing(true);
    try {
      setParseResult(await parseElectoralRollWorkbook(file));
    } catch {
      setActionError("엑셀 파일을 확인하는 중 오류가 발생했습니다.");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleImport() {
    if (!parseResult || parseResult.errors.length > 0) return;
    setActionError(undefined);
    setImportResult(undefined);
    setIsApplying(true);
    try {
      const result = await onImportMembers(parseResult.members);
      setImportResult(result);
      setFileName("");
      setParseResult(undefined);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setActionError("구성원을 초안에 추가하지 못했습니다. 내용을 확인하세요.");
    } finally {
      setIsApplying(false);
    }
  }

  const isBusy = isSubmitting || isApplying;
  const canImport =
    !!parseResult &&
    parseResult.members.length > 0 &&
    parseResult.errors.length === 0 &&
    !isParsing &&
    !isBusy;

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
              템플릿을 내려받아 작성한 뒤 업로드하세요. 기존 구성원은
              유지되고 새 구성원만 추가됩니다.
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
            {isBusy ? "추가 중…" : "검증한 구성원 초안 추가"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          .xlsx · 최대 5MB · 한 번에 최대 5,000명 · 빈 가중치는 1
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
              파일 내용을 확인했습니다. 초안에 추가한 뒤 선거인명부 저장
              버튼으로 반영하세요.
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
