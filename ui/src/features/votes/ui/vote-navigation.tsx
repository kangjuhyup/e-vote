import {
  Building2,
  LayoutDashboard,
  ListChecks,
  ScrollText,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/lib/utils";

interface VoteNavigationProps {
  current:
    | "commissions"
    | "dashboard"
    | "electoral-rolls"
    | "organizations"
    | "votes";
  isMockMode?: boolean;
}

const navigationItems = [
  { href: "/", label: "대시보드", value: "dashboard", icon: LayoutDashboard },
  { href: "/votes", label: "투표 목록", value: "votes", icon: ListChecks },
  { href: "/organization", label: "조직", value: "organizations", icon: Building2 },
  {
    href: "/electoral-rolls",
    label: "선거인명부",
    value: "electoral-rolls",
    icon: ScrollText,
  },
  {
    href: "/commissions",
    label: "위원회",
    value: "commissions",
    icon: Building2,
  },
] as const;

export function VoteNavigation({
  current,
  isMockMode = false,
}: VoteNavigationProps) {
  return (
    <div className="order-3 flex w-full min-w-0 items-center gap-2 lg:order-none lg:w-auto">
      <nav aria-label="주요 메뉴" className="min-w-0 flex-1 lg:flex-none">
        <ul className="flex items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = current === item.value;

            return (
              <li key={item.href} className="min-w-max flex-1 lg:flex-none">
                <Link
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 touch-manipulation items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isCurrent
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {isMockMode ? (
        <Badge
          variant="outline"
          className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          aria-label="Mock API 및 인증 사용 중"
        >
          API · 인증 Mock
        </Badge>
      ) : null}
    </div>
  );
}
