import { Check, Copy, Link2 } from 'lucide-react';

import { PhoneNumberField } from '@/components/forms/phone-number-field';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { toAuthKoreanMobileNumber } from '@/shared/lib/korean-mobile-number';

import type {
  OrganizationInvitation,
  OrganizationMemberRole,
} from '../model/organization.types';

interface Props {
  organizationCode: string;
  invitations: OrganizationInvitation[];
  isCreatingInvitation: boolean;
  message?: string;
  invitationLink?: string;
  onCreateInvitation: (input: {
    contact: string;
    role: OrganizationMemberRole;
  }) => void;
  onCopyLink: () => void;
}

export function OrganizationMembershipManagement(props: Props) {
  return (
    <section className="grid gap-5" aria-label="조직 구성원 관리">
      <Card>
        <CardHeader>
          <CardTitle>초대 링크 만들기</CardTitle>
          <CardDescription>
            기존 회원은 로그인 후 수락하고, 아직 가입하지 않은 사람은 회원가입
            후 수락합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const contact = toAuthKoreanMobileNumber(
                String(data.get('contact') ?? ''),
              );
              if (!contact) return;
              props.onCreateInvitation({
                contact,
                role: String(
                  data.get('role') ?? 'MEMBER',
                ) as OrganizationMemberRole,
              });
            }}
          >
            <PhoneNumberField
              id="invitation-contact"
              label="받는 사람 휴대전화 번호"
              name="contact"
              required
            />
            <RoleSelect />
            <Button disabled={props.isCreatingInvitation} type="submit">
              <Link2 aria-hidden="true" />
              {props.isCreatingInvitation ? '만드는 중…' : '초대 링크 만들기'}
            </Button>
          </form>
          {props.invitationLink ? (
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="break-all text-sm">{props.invitationLink}</p>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={props.onCopyLink}
              >
                <Copy aria-hidden="true" />
                링크 복사
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
      {props.message ? (
        <p className="text-sm" role="status">
          <Check className="mr-1 inline size-4" aria-hidden="true" />
          {props.message}
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>최근 초대</CardTitle>
          <CardDescription>
            {props.organizationCode} 조직에서 만든 초대입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 만든 초대가 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {props.invitations.map((invitation) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                  key={invitation.id}
                >
                  <span>
                    {invitation.contactHint} ·{' '}
                    {invitation.role === 'MANAGER' ? '투표 관리자' : '구성원'}
                  </span>
                  <span className="text-muted-foreground">
                    {invitation.status === 'PENDING'
                      ? '수락 대기'
                      : invitation.status === 'ACCEPTED'
                        ? '참여 완료'
                        : '취소됨'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function RoleSelect() {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      권한
      <Select name="role" defaultValue="MEMBER">
        <option value="MEMBER">구성원</option>
        <option value="MANAGER">투표 관리자</option>
      </Select>
    </label>
  );
}
