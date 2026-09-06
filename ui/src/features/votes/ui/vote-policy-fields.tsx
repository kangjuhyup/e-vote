import type {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VotePolicyRecord,
  VoteWeightMode,
} from '@/features/votes/model/vote-operations.types';

interface VotePolicyFieldsProps {
  className?: string;
  defaultValues?: VotePolicyRecord;
  disabled?: boolean;
}

interface PolicyOption<T extends string> {
  description: string;
  label: string;
  value: T;
}

const defaultPolicy: VotePolicyRecord = {
  participationUnit: 'INDIVIDUAL',
  privacyMode: 'SECRET',
  resultStorageMode: 'DATABASE',
  voteWeightMode: 'EQUAL',
};

export function VotePolicyFields({
  className,
  defaultValues = defaultPolicy,
  disabled = false,
}: VotePolicyFieldsProps) {
  return (
    <div className={`grid gap-3 ${className ?? ''}`}>
      <PolicyChoiceGroup<PrivacyMode>
        legend="공개 범위"
        name="privacyMode"
        defaultValue={defaultValues.privacyMode}
        disabled={disabled}
        options={[
          {
            value: 'SECRET',
            label: '비밀 투표',
            description: '참여 기록에 선택한 후보를 남기지 않습니다.',
          },
          {
            value: 'PUBLIC',
            label: '공개 투표',
            description: '참여 기록에 선택한 후보를 함께 저장합니다.',
          },
        ]}
      />
      <PolicyChoiceGroup<ParticipationUnit>
        legend="참여 단위"
        name="participationUnit"
        defaultValue={defaultValues.participationUnit}
        disabled={disabled}
        options={[
          {
            value: 'INDIVIDUAL',
            label: '개인',
            description: '선거인 한 명을 하나의 참여 단위로 계산합니다.',
          },
          {
            value: 'GROUP',
            label: '그룹',
            description: '같은 그룹의 선거인을 하나의 참여 단위로 계산합니다.',
          },
        ]}
      />
      <PolicyChoiceGroup<VoteWeightMode>
        legend="가중치 방식"
        name="voteWeightMode"
        defaultValue={defaultValues.voteWeightMode}
        disabled={disabled}
        options={[
          {
            value: 'EQUAL',
            label: '동일 가중치',
            description: '모든 참여권을 같은 비중으로 계산합니다.',
          },
          {
            value: 'SHARE',
            label: '지분 가중치',
            description: '선거인명부에 설정한 투표 가중치를 반영합니다.',
          },
        ]}
      />
      <PolicyChoiceGroup<ResultStorageMode>
        legend="결과 저장"
        name="resultStorageMode"
        defaultValue={defaultValues.resultStorageMode}
        disabled={disabled}
        options={[
          {
            value: 'DATABASE',
            label: '데이터베이스',
            description: '투표 결과를 서비스 데이터베이스에 저장합니다.',
          },
          {
            value: 'BLOCKCHAIN',
            label: '블록체인',
            description: '투표 결과를 블록체인 기록으로 저장합니다.',
          },
        ]}
      />
    </div>
  );
}

function PolicyChoiceGroup<T extends string>({
  defaultValue,
  disabled,
  legend,
  name,
  options,
}: {
  defaultValue: T;
  disabled: boolean;
  legend: string;
  name: string;
  options: PolicyOption<T>[];
}) {
  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 rounded-lg border bg-muted/20 p-3 sm:grid sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:gap-4 sm:px-4"
    >
      <legend className="sr-only">{legend}</legend>
      <p aria-hidden="true" className="text-sm font-semibold">
        {legend}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-0">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-16 cursor-pointer items-start gap-2.5 rounded-md border bg-background px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] hover:border-foreground/25 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-2 has-[:checked]:ring-primary/15 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === defaultValue}
              className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium leading-5">
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
