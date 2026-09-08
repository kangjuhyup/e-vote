import { Building2 } from 'lucide-react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface CommissionSetupProps {
  errorMessage?: string;
  isSubmitting: boolean;
  onCreate: (name: string) => void;
}

export function CommissionSetup({
  errorMessage,
  isSubmitting,
  onCreate,
}: CommissionSetupProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onCreate(String(data.get('name') ?? ''));
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {errorMessage ? (
        <p
          role="alert"
          className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}

      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Building2
              className="mt-0.5 size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <CardTitle>위원회 정보</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                위원회를 만든 뒤 상세 화면에서 관리자와 현장 관리자를
                등록할 수 있습니다.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-medium">
              위원회 이름
              <Input
                name="name"
                autoComplete="organization"
                maxLength={100}
                required
                disabled={isSubmitting}
                placeholder="예: 전자투표 운영위원회"
              />
            </label>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '위원회 만드는 중…' : '위원회 만들기'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
