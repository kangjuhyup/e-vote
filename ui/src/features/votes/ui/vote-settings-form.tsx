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
import type { VoteDetail } from "@/features/votes/model/vote.types";

import { VoteAccessFields } from "./vote-access-fields";
import { VotePolicyFields } from "./vote-policy-fields";
import { VoteScheduleFields } from "./vote-schedule-fields";

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
          <VoteScheduleFields
            defaultStartedAt={vote.startsAt}
            defaultEndedAt={vote.endsAt}
            descriptionId="vote-settings-schedule-description"
            disabled={disabled}
          />
          <VotePolicyFields
            className="sm:col-span-2"
            defaultValues={defaultPolicy}
            disabled={disabled}
          />
          <VoteAccessFields
            className="sm:col-span-2"
            defaultIdentityRequired={vote.identityVerificationPolicy?.required}
            defaultVotingChannels={votingChannels}
            disabled={disabled}
          />
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
