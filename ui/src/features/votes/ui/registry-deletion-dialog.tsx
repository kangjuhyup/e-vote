import { ShieldAlert, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface RegistryDeletionDialogProps {
  description: string;
  errorMessage?: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  resourceName: string;
  title: string;
}

export function RegistryDeletionDialog({
  description,
  errorMessage,
  isDeleting,
  onCancel,
  onConfirm,
  resourceName,
  title,
}: RegistryDeletionDialogProps) {
  const titleId = 'registry-deletion-dialog-title';
  const descriptionId = 'registry-deletion-dialog-description';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <dialog
        open
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative m-0 w-[min(92vw,32rem)] max-w-none rounded-xl border bg-background p-0 text-foreground shadow-2xl"
        onCancel={(event) => {
          event.preventDefault();
          if (!isDeleting) onCancel();
        }}
      >
        <div className="border-b px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Trash2 className="size-5 text-destructive" aria-hidden="true" />
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
          </div>
          <p className="mt-1 break-all text-sm text-muted-foreground">
            {resourceName}
          </p>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <ShieldAlert
              className="mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <p id={descriptionId} className="leading-6">
              {description}
            </p>
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
              {isDeleting ? '삭제 중…' : '삭제'}
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
