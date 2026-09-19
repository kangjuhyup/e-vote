"use client";

import { useRef, useState } from "react";

import {
  downloadElectoralRollTemplate,
  parseElectoralRollWorkbook,
} from "@/features/votes/lib/electoral-roll-workbook";
import type {
  ElectoralRollWorkbookParseResult,
  StageElectoralRollMembersResult,
} from "@/features/votes/model/electoral-roll.types";
import type {
  ElectoralRollImportCardProps,
  ElectoralRollImportControl,
} from "@/features/votes/ui/electoral-roll-import-card";

export function useElectoralRollImport({
  isSubmitting,
  mode = "manage",
  onImportMembers,
}: ElectoralRollImportCardProps): ElectoralRollImportControl {
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
    } catch (error) {
      setActionError(
        mode === "create" && error instanceof Error
          ? error.message
          : "구성원을 초안에 추가하지 못했습니다. 내용을 확인하세요.",
      );
    } finally {
      setIsApplying(false);
    }
  }

  const isBusy = isSubmitting || isApplying;
  const canImport = Boolean(
    parseResult &&
      parseResult.members.length > 0 &&
      parseResult.errors.length === 0 &&
      !isParsing &&
      !isBusy,
  );

  return {
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
  };
}
