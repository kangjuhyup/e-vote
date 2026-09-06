import { AlertTriangle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface VoteDeletionSectionProps {
  confirmed: boolean;
  disabled: boolean;
  isDeleting: boolean;
  onConfirmChange: (confirmed: boolean) => void;
  onDelete: () => void;
}

export function VoteDeletionSection({
  confirmed,
  disabled,
  isDeleting,
  onConfirmChange,
  onDelete,
}: VoteDeletionSectionProps) {
  return (
    <Card className="rounded-lg border-destructive/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trash2 className="size-5 text-destructive" aria-hidden="true" />
          <CardTitle className="text-base">투표 삭제</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          id="vote-deletion-description"
          className="flex items-start gap-3 rounded-md bg-destructive/8 p-4 text-sm"
        >
          <AlertTriangle
            className="mt-0.5 size-5 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="leading-6">
              삭제한 투표는 취소 상태로 전환되며 다시 수정하거나 사용할 수
              없습니다.
            </p>
            {disabled ? (
              <p className="text-muted-foreground">
                결제가 시작되지 않은 초안 투표만 삭제할 수 있습니다.
              </p>
            ) : null}
          </div>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border"
            checked={confirmed}
            disabled={disabled || isDeleting}
            aria-describedby="vote-deletion-description"
            onChange={(event) => onConfirmChange(event.target.checked)}
          />
          <span>
            이 투표를 삭제하면 취소 상태가 되며 되돌릴 수 없음을 확인했습니다.
          </span>
        </label>
        <Button
          type="button"
          variant="destructive"
          disabled={disabled || isDeleting || !confirmed}
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" />
          {isDeleting ? "투표 삭제 중…" : "투표 삭제"}
        </Button>
      </CardContent>
    </Card>
  );
}
