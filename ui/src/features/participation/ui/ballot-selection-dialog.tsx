'use client';

import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';

interface BallotSelectionDialogProps {
  candidateName: string;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function BallotSelectionDialog({
  candidateName,
  disabled,
  onCancel,
  onConfirm,
}: BallotSelectionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    return () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="ballot-selection-dialog-title"
      aria-describedby="ballot-selection-dialog-description"
      className="m-auto w-[min(calc(100vw-2rem),28rem)] max-w-none rounded-2xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/55"
      onCancel={(event) => {
        event.preventDefault();
        if (!disabled) onCancel();
      }}
    >
      <div className="border-b px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <h2
            id="ballot-selection-dialog-title"
            className="text-lg font-semibold"
          >
            선택을 저장할까요?
          </h2>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div id="ballot-selection-dialog-description">
          <p className="text-base font-medium">‘{candidateName}’</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            지금은 선택만 저장합니다. 모든 항목을 선택한 뒤 서명하고 결과를
            제출합니다.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            autoFocus
            disabled={disabled}
            onClick={onCancel}
          >
            다시 선택
          </Button>
          <Button type="button" disabled={disabled} onClick={onConfirm}>
            선택 저장
          </Button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
