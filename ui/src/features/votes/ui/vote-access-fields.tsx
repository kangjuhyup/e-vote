import type { VotingChannel } from '@/features/votes/model/vote-operations.types';

interface VoteAccessFieldsProps {
  className?: string;
  defaultIdentityRequired?: boolean;
  defaultVotingChannels?: VotingChannel[];
  disabled?: boolean;
}

const channelOptions: Array<{ label: string; value: VotingChannel }> = [
  { label: '온라인', value: 'ONLINE' },
  { label: '현장', value: 'ONSITE' },
  { label: '방문', value: 'VISIT' },
];

export function VoteAccessFields({
  className,
  defaultIdentityRequired = false,
  defaultVotingChannels = ['ONLINE'],
  disabled = false,
}: VoteAccessFieldsProps) {
  return (
    <div className={`grid gap-3 ${className ?? ''}`}>
      <fieldset
        disabled={disabled}
        className="min-w-0 rounded-lg border bg-muted/20 p-3 sm:grid sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:gap-4 sm:px-4"
      >
        <legend className="sr-only">허용 채널</legend>
        <p aria-hidden="true" className="text-sm font-semibold">
          허용 채널
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:mt-0">
          {channelOptions.map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-2.5 py-2 text-sm font-medium transition-[border-color,background-color,box-shadow] hover:border-foreground/25 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-2 has-[:checked]:ring-primary/15 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
            >
              <input
                type="checkbox"
                name="channel"
                value={option.value}
                defaultChecked={defaultVotingChannels.includes(option.value)}
                className="size-4 shrink-0 accent-[var(--primary)]"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset
        disabled={disabled}
        className="min-w-0 rounded-lg border bg-muted/20 p-3 sm:grid sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:gap-4 sm:px-4"
      >
        <legend className="sr-only">본인인증</legend>
        <p aria-hidden="true" className="text-sm font-semibold">
          본인인증
        </p>
        <label className="mt-2 flex min-h-14 cursor-pointer items-start gap-3 rounded-md border bg-background px-3 py-2.5 transition-[border-color,background-color,box-shadow] hover:border-foreground/25 sm:mt-0 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-2 has-[:checked]:ring-primary/15 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
          <input
            type="checkbox"
            name="identityRequired"
            defaultChecked={defaultIdentityRequired}
            className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">본인인증 필수</span>
            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
              투표에 참여하기 전에 본인확인을 완료하도록 설정합니다.
            </span>
          </span>
        </label>
      </fieldset>
    </div>
  );
}
