import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatKoreanDateTime } from "@/shared/lib/date-format";

export interface ParticipantRosterItem {
  id: string;
  label: string;
  name: string;
  participated: boolean;
  participatedAt: string | null;
}

interface ParticipantRosterProps {
  emptyLabel?: string;
  items: ParticipantRosterItem[];
  title: string;
}

export function ParticipantRoster({
  emptyLabel,
  items,
  title,
}: ParticipantRosterProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 && emptyLabel ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : null}
        {items.length > 0 ? (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-3 font-medium">이름</th>
                <th className="py-3 font-medium">구분</th>
                <th className="py-3 font-medium">상태</th>
                <th className="py-3 font-medium">참여 시각</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-medium">{item.name}</td>
                  <td className="py-3 text-muted-foreground">{item.label}</td>
                  <td className="py-3">
                    <Badge variant={item.participated ? "default" : "outline"}>
                      {item.participated ? "참여" : "미참여"}
                    </Badge>
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {item.participatedAt
                      ? formatKoreanDateTime(item.participatedAt)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
