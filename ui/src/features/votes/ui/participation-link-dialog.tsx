'use client';

import { Copy, ExternalLink, MessageSquareText, RotateCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatInvitationDispatchResult } from '@/features/votes/lib/participation-invitation';
import type {
  ParticipationInvitationDevelopmentLink,
  ParticipationInvitationDispatchResult,
} from '@/features/votes/model/participation-invitation.types';
import type { ElectorRecord } from '@/features/votes/model/vote-operations.types';

interface ParticipationLinkDialogProps {
  elector: ElectorRecord;
  error?: string;
  developmentLink?: ParticipationInvitationDevelopmentLink;
  developmentLinkError?: string;
  isIssuing: boolean;
  isLoadingDevelopmentLink: boolean;
  onClose: () => void;
  onIssue: () => void;
  result?: ParticipationInvitationDispatchResult;
  showDevelopmentLink: boolean;
}

export function ParticipationLinkDialog({
  elector,
  error,
  developmentLink,
  developmentLinkError,
  isIssuing,
  isLoadingDevelopmentLink,
  onClose,
  onIssue,
  result,
  showDevelopmentLink,
}: ParticipationLinkDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copyMessage, setCopyMessage] = useState<string>();
  const isBusy = isIssuing || isLoadingDevelopmentLink;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    return () => {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    };
  }, []);

  async function handleCopy() {
    if (!developmentLink) return;
    try {
      await navigator.clipboard.writeText(developmentLink.participationUrl);
      setCopyMessage('링크를 복사했습니다.');
    } catch {
      setCopyMessage('링크를 복사하지 못했습니다. 직접 선택해 복사해 주세요.');
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="participation-link-dialog-title"
      className="m-auto w-[min(92vw,34rem)] max-w-none rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50"
      onCancel={(event) => { event.preventDefault(); if (!isBusy) onClose(); }}
      onClose={onClose}
    >
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
            <h2 id="participation-link-dialog-title" className="text-lg font-semibold">{showDevelopmentLink ? '선거인 참여 링크' : '참여 링크 재발급'}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{elector.name} · {elector.identifier}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="선거인 참여 링크 팝업 닫기" disabled={isBusy} onClick={onClose}>
          <X aria-hidden="true" />
        </Button>
      </div>
      <div className="space-y-4 px-5 py-5 sm:px-6">
        {result ? (
          <p role="status" className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm leading-6">
            {formatInvitationDispatchResult(result)} 이전 링크는 폐기되며 새 링크가 문자로 발송됩니다.
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            기존 참여 링크를 폐기하고 새 영구 참여 링크의 문자 발송을 예약합니다.
            {showDevelopmentLink
              ? ' 개발 환경에서는 현재 링크를 아래에서 확인할 수 있습니다.'
              : ' 링크와 휴대전화 원문은 화면에 표시되지 않습니다.'}
          </p>
        )}
        {showDevelopmentLink ? (
          <section aria-labelledby="development-participation-link-title" className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
            <div>
              <h3 id="development-participation-link-title" className="font-medium">개발용 참여 링크</h3>
              <p className="mt-1 text-xs leading-5 text-amber-800">실제 교환 가능한 토큰이 포함되어 있으며 개발·테스트 환경에서만 표시됩니다.</p>
            </div>
            {isLoadingDevelopmentLink ? (
              <p role="status" className="text-sm">현재 링크를 불러오는 중…</p>
            ) : developmentLink ? (
              <div className="space-y-3">
                <input
                  aria-label="개발용 참여 링크"
                  className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-foreground"
                  readOnly
                  type="url"
                  value={developmentLink.participationUrl}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy()}>
                    <Copy aria-hidden="true" />
                    링크 복사
                  </Button>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <a href={developmentLink.participationUrl} target="_blank" rel="noreferrer">
                      <ExternalLink aria-hidden="true" />
                      링크 열기
                    </a>
                  </Button>
                </div>
                {copyMessage ? <p role="status" className="text-xs">{copyMessage}</p> : null}
              </div>
            ) : developmentLinkError ? (
              <p role="status" className="text-sm">{developmentLinkError}</p>
            ) : null}
          </section>
        ) : null}
        {error ? <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={isBusy} onClick={onClose}>{result ? '닫기' : '취소'}</Button>
          {!result ? (
            <Button type="button" disabled={isBusy} onClick={onIssue}>
              <RotateCw aria-hidden="true" />
              {isIssuing ? '재발급 요청 중…' : '새 링크 문자 발송'}
            </Button>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
