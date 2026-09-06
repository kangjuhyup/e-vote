import { RefreshCw, Users } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import type { ElectoralRollPageItemRecord } from "@/features/votes/model/electoral-roll.types";

interface VoteElectoralRollSetupProps {
  currentSnapshotId?: string;
  disabled: boolean;
  electoralRolls: ElectoralRollPageItemRecord[];
  isSubmitting: boolean;
  onElectoralRollChange: (electoralRollId: string) => void;
  onSubmit: (electoralRollId: string) => void;
  selectedElectoralRollId: string;
}

export function VoteElectoralRollSetup({
  currentSnapshotId,
  disabled,
  electoralRolls,
  isSubmitting,
  onElectoralRollChange,
  onSubmit,
  selectedElectoralRollId,
}: VoteElectoralRollSetupProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedElectoralRollId) onSubmit(selectedElectoralRollId);
  }

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" aria-hidden="true" />
          <CardTitle>선거인명부 연결</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          현재 명부를 다시 연결하거나 다른 명부로 교체합니다. 선택한 명부의
          최신 구성이 자동으로 적용됩니다.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <p className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {currentSnapshotId
              ? "현재 선거인명부가 연결되어 있습니다."
              : "현재 연결된 선거인명부가 없습니다."}
          </p>
          <label className="grid gap-2 text-sm font-medium">
            연결할 선거인명부
            <Select
              aria-label="연결할 선거인명부"
              disabled={disabled || isSubmitting}
              value={selectedElectoralRollId}
              onChange={(event) => onElectoralRollChange(event.target.value)}
            >
              <option value="">선거인명부를 선택하세요</option>
              {electoralRolls.map((electoralRoll) => (
                <option key={electoralRoll.id} value={electoralRoll.id}>
                  {electoralRoll.name} · {electoralRoll.memberCount.toLocaleString()}명
                  · revision {electoralRoll.revision}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              투표 확정 전까지 기존 선거인 구성을 교체할 수 있습니다.
            </p>
            <Button
              type="submit"
              disabled={disabled || isSubmitting || !selectedElectoralRollId}
            >
              <RefreshCw aria-hidden="true" />
              {isSubmitting ? "연결 중…" : "명부 다시 연결 또는 교체"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
