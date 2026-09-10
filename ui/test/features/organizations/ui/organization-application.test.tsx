/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OrganizationApplicationForm } from '@/features/organizations/ui/organization-application-form';
import { OrganizationApplicationStatus } from '@/features/organizations/ui/organization-application-status';
import { OrganizationMembershipManagement } from '@/features/organizations/ui/organization-membership-management';

afterEach(cleanup);

describe('organization application UI', () => {
  it('submits organization information without Auth credentials', () => {
    const onSubmit = vi.fn();
    render(
      <OrganizationApplicationForm isSubmitting={false} onSubmit={onSubmit} />,
    );
    fireEvent.change(screen.getByLabelText('조직명'), {
      target: { value: '동부센트레빌아파트' },
    });
    fireEvent.change(screen.getByLabelText('담당자 이름'), {
      target: { value: '김관리' },
    });
    fireEvent.change(screen.getByLabelText('연락처 (선택)'), {
      target: { value: '01012345678' },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: '조직 생성 신청' }).closest('form')!,
    );
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationName: '동부센트레빌아파트',
        organizationType: 'APARTMENT',
        contactName: '김관리',
        contactPhone: '+8201012345678',
      }),
    );
    expect(screen.queryByLabelText('조직관리번호')).toBeNull();
    expect(screen.getByText(/승인 시 자동으로 발급/)).toBeTruthy();
  });

  it('requires a fresh login after approval', () => {
    const onReauthenticate = vi.fn();
    render(
      <OrganizationApplicationStatus
        application={{
          id: 'application-1',
          organizationName: '동부센트레빌아파트',
          organizationManagementNumber: 'apt-2026-001',
          organizationType: 'APARTMENT',
          contactName: '김관리',
          status: 'APPROVED',
          submittedAt: '2026-09-09T00:00:00.000Z',
        }}
        onReauthenticate={onReauthenticate}
      />,
    );
    expect(screen.getByText(/새 조직 권한은 새 로그인부터 적용/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 로그인' }));
    expect(onReauthenticate).toHaveBeenCalledOnce();
  });

  it('creates an invitation with the Auth mobile number format', () => {
    const onCreateInvitation = vi.fn();
    render(
      <OrganizationMembershipManagement
        organizationCode="org-1"
        invitations={[]}
        isCreatingInvitation={false}
        onCreateInvitation={onCreateInvitation}
        onCopyLink={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('받는 사람 휴대전화 번호'), {
      target: { value: '01012345678' },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: '초대 링크 만들기' }).closest('form')!,
    );

    expect(onCreateInvitation).toHaveBeenCalledWith({
      contact: '+8201012345678',
      role: 'MEMBER',
    });
  });
});
