import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VoteActivity } from "@/features/votes/model/vote.types";

interface VoteActivityCardProps {
  activities: VoteActivity[];
}

export function VoteActivityCard({ activities }: VoteActivityCardProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>최근 투표 활동</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="space-y-1">
            <p className="font-medium">{activity.title}</p>
            <p className="text-sm text-muted-foreground">{activity.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
