import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  participationStatus?: "participated" | "not-participated" | "unknown";
}

interface ParticipantRosterProps {
  emptyLabel?: string;
  items: ParticipantRosterItem[];
  onPageChange?: (page: number) => void;
  page?: number;
  pageSize?: number;
  title: string;
}

export function ParticipantRoster({
  emptyLabel,
  items,
  onPageChange,
  page = 1,
  pageSize = 25,
  title,
}: ParticipantRosterProps) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(pageCount, Math.max(1, page));
  const firstItemIndex = (currentPage - 1) * pageSize;
  const visibleItems = items.slice(firstItemIndex, firstItemIndex + pageSize);

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
          <>
            <p className="mb-2 text-xs text-muted-foreground md:hidden">
              표를 좌우로 이동해 전체 열을 확인할 수 있습니다.
            </p>
            <div
              className="overflow-x-auto rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              role="region"
              aria-label={`${title} 표`}
              tabIndex={0}
            >
              <table className="w-full min-w-[560px] text-left text-sm">
                <caption className="sr-only">{title}</caption>
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      이름
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      구분
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      상태
                    </th>
                    <th scope="col" className="py-3 font-medium">
                      참여 시각
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visibleItems.map((item) => (
                    <ParticipantRosterRow key={item.id} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
            {pageCount > 1 && onPageChange ? (
              <nav
                aria-label={`${title} 페이지`}
                className="mt-4 flex flex-wrap items-center justify-between gap-3"
              >
                <p
                  className="text-sm tabular-nums text-muted-foreground"
                  aria-live="polite"
                >
                  {`${firstItemIndex + 1}-${Math.min(
                    firstItemIndex + pageSize,
                    items.length,
                  )} / ${items.length}명`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-10"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                  >
                    <ChevronLeft aria-hidden="true" />
                    이전
                  </Button>
                  <span className="min-w-14 text-center text-sm tabular-nums">
                    {currentPage} / {pageCount}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-10"
                    disabled={currentPage === pageCount}
                    onClick={() => onPageChange(currentPage + 1)}
                  >
                    다음
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              </nav>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ParticipantRosterRow({ item }: { item: ParticipantRosterItem }) {
  const participationStatus =
    item.participationStatus ??
    (item.participated ? "participated" : "not-participated");
  const isUnknown = participationStatus === "unknown";

  return (
    <tr>
      <td className="break-words py-3 pr-4 font-medium">{item.name}</td>
      <td className="break-words py-3 pr-4 text-muted-foreground">{item.label}</td>
      <td className="py-3 pr-4">
        <Badge
          variant={participationStatus === "participated" ? "default" : "outline"}
        >
          {isUnknown
            ? "집계 전"
            : participationStatus === "participated"
              ? "참여"
              : "미참여"}
        </Badge>
      </td>
      <td className="py-3 text-muted-foreground">
        {item.participatedAt && !isUnknown
          ? formatKoreanDateTime(item.participatedAt)
          : "-"}
      </td>
    </tr>
  );
}
