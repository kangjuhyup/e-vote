import { Save } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { VoteDetail } from "@/features/votes/model/vote.types";

interface VoteSettingsFormProps {
  disabled?: boolean;
  isSubmitting: boolean;
  onSubmit: (data: FormData) => void;
  vote: VoteDetail;
}

export function VoteSettingsForm({
  disabled = false,
  isSubmitting,
  onSubmit,
  vote,
}: VoteSettingsFormProps) {
  const defaultPolicy = vote.defaultPolicy ?? {
    privacyMode: "SECRET" as const,
    participationUnit: "INDIVIDUAL" as const,
    resultStorageMode: "DATABASE" as const,
    voteWeightMode: "EQUAL" as const,
  };
  const votingChannels = vote.votingChannels ?? ["ONLINE"];

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>투표 기본 설정</CardTitle>
        <p className="text-sm text-muted-foreground">
          제목, 투표 정책과 허용 채널을 수정합니다. 위원회 배정은 투표 생성
          후 변경할 수 없습니다.
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={formHandler(onSubmit)}
        >
          <Field
            label="투표 제목"
            name="title"
            defaultValue={vote.title}
            required
            disabled={disabled}
            className="sm:col-span-2"
          />
          <label className="grid gap-2 text-sm font-medium">
            공개 범위
            <Select
              name="privacyMode"
              defaultValue={defaultPolicy.privacyMode}
              disabled={disabled}
            >
              <option value="SECRET">비밀 투표</option>
              <option value="PUBLIC">공개 투표</option>
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            참여 단위
            <Select
              name="participationUnit"
              defaultValue={defaultPolicy.participationUnit}
              disabled={disabled}
            >
              <option value="INDIVIDUAL">개인</option>
              <option value="GROUP">그룹</option>
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            가중치 방식
            <Select
              name="voteWeightMode"
              defaultValue={defaultPolicy.voteWeightMode}
              disabled={disabled}
            >
              <option value="EQUAL">동일 가중치</option>
              <option value="SHARE">지분 가중치</option>
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            결과 저장
            <Select
              name="resultStorageMode"
              defaultValue={defaultPolicy.resultStorageMode}
              disabled={disabled}
            >
              <option value="DATABASE">데이터베이스</option>
              <option value="BLOCKCHAIN">블록체인</option>
            </Select>
          </label>
          <fieldset className="sm:col-span-2" disabled={disabled}>
            <legend className="text-sm font-medium">허용 채널</legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <CheckOption
                value="ONLINE"
                label="온라인"
                defaultChecked={votingChannels.includes("ONLINE")}
              />
              <CheckOption
                value="ONSITE"
                label="현장"
                defaultChecked={votingChannels.includes("ONSITE")}
              />
              <CheckOption
                value="VISIT"
                label="방문"
                defaultChecked={votingChannels.includes("VISIT")}
              />
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="identityRequired"
              defaultChecked={vote.identityVerificationPolicy?.required}
              disabled={disabled}
              className="size-4 rounded border"
            />
            본인인증 필수
          </label>
          <Button
            type="submit"
            className="sm:col-span-2"
            disabled={disabled || isSubmitting}
          >
            <Save aria-hidden="true" />
            {isSubmitting ? "저장 중…" : "투표 설정 저장"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CheckOption({
  defaultChecked,
  label,
  value,
}: {
  defaultChecked: boolean;
  label: string;
  value: string;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        name="channel"
        value={value}
        defaultChecked={defaultChecked}
        className="size-4 rounded border"
      />
      {label}
    </label>
  );
}

function Field({
  className,
  label,
  name,
  ...props
}: {
  className?: string;
  label: string;
  name: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <label className={`grid gap-2 text-sm font-medium ${className ?? ""}`}>
      {label}
      <Input name={name} {...props} />
    </label>
  );
}

function formHandler(handler: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handler(new FormData(event.currentTarget));
  };
}
