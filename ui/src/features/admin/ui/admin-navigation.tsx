import Link from 'next/link';
import { cn } from '@/shared/lib/utils';

export function AdminNavigation({ current }: { current: 'overview' | 'payments' | 'applications' | 'vote-changes' }) {
  return (
    <nav aria-label="관리자 메뉴" className="flex gap-1 rounded-lg bg-muted p-1">
      {[
        { href: '/admin/operations', label: '운영 현황', value: 'overview' },
        { href: '/admin/payments', label: '결제 관리', value: 'payments' },
        { href: '/admin/vote-content-changes', label: '투표 변경 요청', value: 'vote-changes' },
        { href: '/admin/organization-applications', label: '조직 신청', value: 'applications' },
      ].map((item) => (
        <Link key={item.href} href={item.href} aria-current={current === item.value ? 'page' : undefined}
          className={cn('rounded-md px-3 py-2 text-sm font-medium', current === item.value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
