import { LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ElectoralRollSnapshotSectionProps {
  currentRevision: number;
  memberCount: number;
}

export function ElectoralRollSnapshotSection({
  currentRevision,
  memberCount,
}: ElectoralRollSnapshotSectionProps) {
  return (
    <section aria-labelledby="electoral-roll-snapshot-title" className="space-y-4">
      <div>
        <h2 id="electoral-roll-snapshot-title" className="text-lg font-semibold">
          선거인명부 스냅샷
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          명부가 변경될 때마다 해당 revision의 선거인 구성을 자동으로 보관합니다.
        </p>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LockKeyhole
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <CardTitle className="text-base">불변 스냅샷</CardTitle>
            </div>
            <Badge variant="outline">revision {currentRevision}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            revision 1부터 스냅샷이 자동 생성되며 수정하거나 삭제할 수
            없습니다. 투표 생성 시 서버가 이 명부의 최신 스냅샷을
            선택합니다.
          </p>
          {currentRevision < 1 ? (
            <p className="text-sm text-muted-foreground">
              구성원을 한 번 이상 변경하면 첫 스냅샷이 자동 보관됩니다.
            </p>
          ) : (
            <dl className="grid gap-3 rounded-md bg-muted p-4 text-sm sm:grid-cols-2">
              <Summary label="최신 revision" value={String(currentRevision)} />
              <Summary
                label="구성원 수"
                value={`${memberCount.toLocaleString()}명`}
              />
            </dl>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-medium">{value}</dd>
    </div>
  );
}
