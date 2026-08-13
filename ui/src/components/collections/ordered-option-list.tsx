import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface OrderedOptionItem {
  description: string;
  id: string;
  order: number;
  title: string;
}

interface OrderedOptionListProps {
  emptyLabel?: string;
  items: OrderedOptionItem[];
  title: string;
}

export function OrderedOptionList({
  emptyLabel,
  items,
  title,
}: OrderedOptionListProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.length === 0 && emptyLabel ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : null}
        {items.map((item) => (
          <div key={item.id} className="rounded-md border p-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{item.order}</Badge>
              <p className="font-medium">{item.title}</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
