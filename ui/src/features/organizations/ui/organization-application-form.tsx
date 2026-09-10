import type { FormEvent } from 'react';

import { PhoneNumberField } from '@/components/forms/phone-number-field';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toKoreanMobileE164 } from '@/shared/lib/korean-mobile-number';

import type { CreateOrganizationApplicationInput } from '../model/organization.types';

interface OrganizationApplicationFormProps {
  errorMessage?: string;
  isSubmitting: boolean;
  onSubmit: (input: CreateOrganizationApplicationInput) => void;
}

export function OrganizationApplicationForm({
  errorMessage,
  isSubmitting,
  onSubmit,
}: OrganizationApplicationFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const contactPhone = toKoreanMobileE164(
      String(form.get('contactPhone') ?? ''),
    );
    onSubmit({
      organizationName: String(form.get('organizationName') ?? '').trim(),
      organizationType: String(
        form.get('organizationType'),
      ) as CreateOrganizationApplicationInput['organizationType'],
      contactName: String(form.get('contactName') ?? '').trim(),
      ...(contactPhone ? { contactPhone } : {}),
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>조직 생성 신청</CardTitle>
        <CardDescription>
          운영자 승인 후 조직과 투표 관리자 권한이 설정됩니다.
          조직관리번호는 승인 시 자동으로 발급됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="organization-name">
              조직명
            </label>
            <Input
              id="organization-name"
              name="organizationName"
              autoComplete="organization"
              required
              maxLength={128}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="organization-type">
              조직 유형
            </label>
            <Select
              id="organization-type"
              name="organizationType"
              defaultValue="APARTMENT"
              required
            >
              <option value="APARTMENT">아파트</option>
              <option value="ASSOCIATION">협회·조합</option>
              <option value="COMPANY">회사</option>
              <option value="OTHER">기타</option>
            </Select>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="contact-name">
                담당자 이름
              </label>
              <Input
                id="contact-name"
                name="contactName"
                autoComplete="name"
                required
                maxLength={64}
              />
            </div>
            <PhoneNumberField
              id="contact-phone"
              name="contactPhone"
              label="연락처 (선택)"
            />
          </div>
          {errorMessage ? (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '신청하는 중…' : '조직 생성 신청'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
