'use client';

import { MessageSquareText, RotateCw, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { formatInvitationDispatchResult } from '@/features/votes/lib/participation-invitation';
import type { ParticipationInvitationDispatchResult } from '@/features/votes/model/participation-invitation.types';
import type { ElectorRecord } from '@/features/votes/model/vote-operations.types';

interface ParticipationLinkDialogProps {
  elector: ElectorRecord;
  error?: string;
  isIssuing: boolean;
  onClose: () => void;
  onIssue: () => void;
  result?: ParticipationInvitationDispatchResult;
}

export function ParticipationLinkDialog({ elector, error, isIssuing, onClose, onIssue, result }: ParticipationLinkDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    return () => {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="participation-link-dialog-title"
      className="m-auto w-[min(92vw,34rem)] max-w-none rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50"
      onCancel={(event) => { event.preventDefault(); if (!isIssuing) onClose(); }}
      onClose={onClose}
    >
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
            <h2 id="participation-link-dialog-title" className="text-lg font-semibold">참여 링크 재발급</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{elector.name} · {elector.identifier}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="참여 링크 재발급 팝업 닫기" disabled={isIssuing} onClick={onClose}>
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
            기존 참여 링크를 폐기하고 새 영구 참여 링크의 문자 발송을 예약합니다. 링크와 휴대전화 원문은 화면에 표시되지 않습니다.
          </p>
        )}
        {error ? <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={isIssuing} onClick={onClose}>{result ? '닫기' : '취소'}</Button>
          {!result ? (
            <Button type="button" disabled={isIssuing} onClick={onIssue}>
              <RotateCw aria-hidden="true" />
              {isIssuing ? '재발급 요청 중…' : '새 링크 문자 발송'}
            </Button>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
