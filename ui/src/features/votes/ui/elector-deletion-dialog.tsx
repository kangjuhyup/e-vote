import { ShieldAlert, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ElectorRecord } from '@/features/votes/model/vote-operations.types';

interface ElectorDeletionDialogProps {
  elector: ElectorRecord;
  errorMessage?: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ElectorDeletionDialog({
  elector,
  errorMessage,
  isDeleting,
  onCancel,
  onConfirm,
}: ElectorDeletionDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <dialog
        open
        aria-labelledby="elector-deletion-dialog-title"
        aria-describedby="elector-deletion-dialog-description"
        className="relative m-0 w-[min(92vw,32rem)] max-w-none rounded-xl border bg-background p-0 text-foreground shadow-2xl"
        onCancel={(event) => {
          event.preventDefault();
          if (!isDeleting) onCancel();
        }}
      >
        <div className="border-b px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Trash2 className="size-5 text-destructive" aria-hidden="true" />
            <h2
              id="elector-deletion-dialog-title"
              className="text-lg font-semibold"
            >
              선거인 삭제
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {elector.name} · {elector.identifier}
          </p>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <ShieldAlert
              className="mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <div
              id="elector-deletion-dialog-description"
              className="leading-6"
            >
              <p className="font-medium">이 선거인을 삭제하시겠습니까?</p>
              <p className="mt-1">
                서버에서는 선거인을 차단 상태로 전환합니다. 차단된 선거인은
                투표에 참여하거나 새 참여 링크를 발급받을 수 없습니다.
              </p>
            </div>
          </div>
          {errorMessage ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              autoFocus
              disabled={isDeleting}
              onClick={onCancel}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={onConfirm}
            >
              <Trash2 aria-hidden="true" />
              {isDeleting ? '삭제 중…' : '선거인 삭제'}
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
