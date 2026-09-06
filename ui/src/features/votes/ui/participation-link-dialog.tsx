"use client";

import { Check, Copy, ExternalLink, Link2, ShieldAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  ElectorRecord,
  ParticipationInvitationRecord,
} from "@/features/votes/model/vote-operations.types";

interface ParticipationLinkDialogProps {
  elector: ElectorRecord;
  error?: string;
  invitation?: ParticipationInvitationRecord;
  isIssuing: boolean;
  onClose: () => void;
  onIssue: () => void;
}

export function ParticipationLinkDialog({
  elector,
  error,
  invitation,
  isIssuing,
  onClose,
  onIssue,
}: ParticipationLinkDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copyStatus, setCopyStatus] = useState<"copied" | "error">();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }

    return () => {
      if (typeof dialog.close === "function" && dialog.open) {
        dialog.close();
      }
    };
  }, []);

  async function handleCopy() {
    if (!invitation) return;

    try {
      await navigator.clipboard.writeText(invitation.participationUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="participation-link-dialog-title"
      aria-describedby="participation-link-dialog-description"
      className="m-auto w-[min(92vw,36rem)] max-w-none rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50"
      onCancel={(event) => {
        event.preventDefault();
        if (!isIssuing) onClose();
      }}
      onClose={onClose}
    >
      <div className="border-b px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link2 className="size-5 text-primary" aria-hidden="true" />
              <h2
                id="participation-link-dialog-title"
                className="text-lg font-semibold"
              >
                선거인 참여 링크
              </h2>
            </div>
            <p
              id="participation-link-dialog-description"
              className="mt-1 text-sm text-muted-foreground"
            >
              {elector.name} · {elector.identifier}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="참여 링크 팝업 닫기"
            disabled={isIssuing}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        {invitation ? (
          <>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium">발급된 참여 링크</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  aria-label={`${elector.name} 선거인 참여 링크`}
                  className="font-mono text-xs"
                  readOnly
                  value={invitation.participationUrl}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button type="button" variant="outline" onClick={handleCopy}>
                  {copyStatus === "copied" ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <Copy aria-hidden="true" />
                  )}
                  {copyStatus === "copied" ? "복사됨" : "복사"}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                링크를 열어 로그인하면 서버가 해당 계정과 선거인의 연결을
                확인합니다.
              </p>
              {copyStatus === "error" ? (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  자동 복사를 사용할 수 없습니다. 링크를 직접 선택해 복사해 주세요.
                </p>
              ) : (
                <p className="sr-only" role="status" aria-live="polite">
                  {copyStatus === "copied" ? "참여 링크를 복사했습니다." : ""}
                </p>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                닫기
              </Button>
              <Button type="button" asChild>
                <a
                  href={invitation.participationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  <ExternalLink aria-hidden="true" />
                  새 창에서 열기
                </a>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 rounded-lg border border-amber-300/70 bg-amber-50 p-4 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
              <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div className="text-sm leading-6">
                <p className="font-medium">참여 링크를 만드시겠습니까?</p>
                <p className="mt-1">
                  링크에는 투표와 선거인 식별자만 포함됩니다. 링크를 받은 사람도
                  본인 계정으로 로그인하고 Mock 확인을 마쳐야 투표할 수 있습니다.
                </p>
              </div>
            </div>
            {error ? (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isIssuing}
                onClick={onClose}
              >
                취소
              </Button>
              <Button type="button" disabled={isIssuing} onClick={onIssue}>
                <Link2 aria-hidden="true" />
                {isIssuing ? "생성 중…" : "참여 링크 생성"}
              </Button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
