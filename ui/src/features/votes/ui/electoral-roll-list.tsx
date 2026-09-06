import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ElectoralRollPageRecord } from '@/features/votes/model/electoral-roll.types';
import { formatKoreanDateTime } from '@/shared/lib/date-format';

interface ElectoralRollListProps {
  onPageChange: (page: number) => void;
  onSelect: (electoralRollId: string) => void;
  page: ElectoralRollPageRecord;
}

export function ElectoralRollList({
  onPageChange,
  onSelect,
  page,
}: ElectoralRollListProps) {
  return (
    <Card className="gap-0 overflow-hidden rounded-lg py-0">
      <CardHeader className="border-b py-5">
        <CardTitle className="text-base">선거인명부 목록</CardTitle>
        <p className="text-sm tabular-nums text-muted-foreground">
          전체 {page.totalItems.toLocaleString()}개
        </p>
      </CardHeader>
      <CardContent className="px-0">
        {page.items.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            등록된 선거인명부가 없습니다.
          </p>
        ) : (
          <>
            <p className="px-6 pt-4 text-xs text-muted-foreground md:hidden">
              표를 좌우로 이동해 전체 열을 확인할 수 있습니다.
            </p>
            <div
              className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              role="region"
              aria-label="선거인명부 목록 표"
              tabIndex={0}
            >
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">선거인명부 목록</caption>
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-3 pl-6 pr-3 font-medium">
                      명부
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-right font-medium"
                    >
                      구성원
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-right font-medium"
                    >
                      revision
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      최종 수정
                    </th>
                    <th
                      scope="col"
                      className="py-3 pl-3 pr-6 text-right font-medium"
                    >
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {page.items.map((roll) => (
                    <tr key={roll.id} className="hover:bg-muted/30">
                      <td className="py-4 pl-6 pr-3">
                        <p className="font-medium">{roll.name}</p>
                      </td>
                      <td className="px-3 py-4 text-right tabular-nums">
                        {roll.memberCount.toLocaleString()}명
                      </td>
                      <td className="px-3 py-4 text-right tabular-nums">
                        {roll.revision.toLocaleString()}
                      </td>
                      <td className="px-3 py-4 text-muted-foreground">
                        {formatKoreanDateTime(roll.updatedAt)}
                      </td>
                      <td className="py-4 pl-3 pr-6 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-label={`${roll.name} 열기`}
                          onClick={() => onSelect(roll.id)}
                        >
                          열기
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {page.totalPages > 1 ? (
              <nav
                aria-label="선거인명부 목록 페이지"
                className="flex items-center justify-end gap-2 border-t px-6 py-4"
              >
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page.page <= 1}
                  onClick={() => onPageChange(page.page - 1)}
                >
                  <ChevronLeft aria-hidden="true" />
                  이전
                </Button>
                <span className="min-w-14 text-center text-sm tabular-nums">
                  {page.page} / {page.totalPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page.page >= page.totalPages}
                  onClick={() => onPageChange(page.page + 1)}
                >
                  다음
                  <ChevronRight aria-hidden="true" />
                </Button>
              </nav>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
