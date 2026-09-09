import { Check, Copy, Link2, UserPlus } from 'lucide-react';

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

import type {
  OrganizationInvitation,
  OrganizationMemberRole,
} from '../model/organization.types';

interface Props {
  organizationCode: string;
  invitations: OrganizationInvitation[];
  isAdding: boolean;
  isCreatingInvitation: boolean;
  message?: string;
  invitationLink?: string;
  onAddMember: (input: {
    identifier: string;
    role: OrganizationMemberRole;
  }) => void;
  onCreateInvitation: (input: {
    contact: string;
    role: OrganizationMemberRole;
  }) => void;
  onCopyLink: () => void;
}

export function OrganizationMembershipManagement(props: Props) {
  return (
    <section
      className="grid gap-5 lg:grid-cols-2"
      aria-label="조직 구성원 관리"
    >
      <Card>
        <CardHeader>
          <CardTitle>기존 회원 추가</CardTitle>
          <CardDescription>
            가입된 회원을 아이디, 이메일 또는 휴대전화 번호로 찾습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              props.onAddMember({
                identifier: String(data.get('identifier') ?? '').trim(),
                role: String(
                  data.get('role') ?? 'MEMBER',
                ) as OrganizationMemberRole,
              });
            }}
          >
            <label className="grid gap-1.5 text-sm font-medium">
              회원 찾기
              <Input
                name="identifier"
                required
                placeholder="아이디, 이메일 또는 휴대전화 번호"
              />
            </label>
            <RoleSelect />
            <Button disabled={props.isAdding} type="submit">
              <UserPlus aria-hidden="true" />
              {props.isAdding ? '추가하는 중…' : '조직에 추가'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>초대 링크 만들기</CardTitle>
          <CardDescription>
            아직 가입하지 않은 사람도 링크에서 가입한 뒤 참여할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              props.onCreateInvitation({
                contact: String(data.get('contact') ?? '').trim(),
                role: String(
                  data.get('role') ?? 'MEMBER',
                ) as OrganizationMemberRole,
              });
            }}
          >
            <label className="grid gap-1.5 text-sm font-medium">
              받는 사람
              <Input
                name="contact"
                required
                placeholder="이메일 또는 휴대전화 번호"
              />
            </label>
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
        <p className="lg:col-span-2 text-sm" role="status">
          <Check className="mr-1 inline size-4" aria-hidden="true" />
          {props.message}
        </p>
      ) : null}
      <Card className="lg:col-span-2">
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
