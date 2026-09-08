import { isApiMockMode } from "@/shared/config/api-mode";
import { voteApiFetch } from "@/shared/auth/vote-api-fetch";

import type {
  SendFieldSessionSmsInput,
  SendVoteSmsInput,
  ParticipationReminderTemplate,
  SmsDelivery,
  SmsDispatchDetail,
  SmsDispatchPage,
  SmsDispatchSummary,
  SmsPurpose,
  VoteSmsPurpose,
} from "../model/vote-sms.types";
import { unwrapVoteApiResponse } from "./votes-api";

type ApiFetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface CreateVoteSmsApiClientOptions {
  baseUrl?: string;
  fetcher?: ApiFetcher;
  mode?: "live" | "mock";
  now?: () => string;
}

interface SendSmsResponseDto {
  failureCount: number;
  fieldVotingSessionId?: string;
  purpose: SmsPurpose;
  recipientCount: number;
  sentAt: string;
  smsDispatchId: string;
  successCount: number;
  voteId: string;
}

const purposePaths: Record<VoteSmsPurpose, string> = {
  UPCOMING_VOTE_NOTICE: "upcoming-notice",
  VOTE_PARTICIPATION_REMINDER: "participation-reminder",
  VOTE_RESULT_NOTICE: "result-notice",
};

function resolveBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_VOTE_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    ""
  ).replace(/\/+$/, "");
}

function encode(value: string) {
  return encodeURIComponent(value);
}

function buildUrl(baseUrl: string, path: string, query?: URLSearchParams) {
  const search = query && query.size > 0 ? `?${query.toString()}` : "";
  return `${baseUrl}${path}${search}`;
}

async function request<T>(
  fetcher: ApiFetcher,
  baseUrl: string,
  path: string,
  init: RequestInit = {},
  query?: URLSearchParams,
) {
  if (baseUrl.length === 0) {
    throw new Error("NEXT_PUBLIC_VOTE_API_BASE_URL is required in live mode");
  }

  const response = await fetcher(buildUrl(baseUrl, path, query), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error("현재 투표 상태에서는 이 문자를 발송할 수 없습니다.");
    }
    if (response.status === 503) {
      throw new Error("문자 발송 서비스가 설정되지 않았습니다.");
    }
    if (response.status === 404) {
      throw new Error("문자 발송 대상이나 이력을 찾을 수 없습니다.");
    }
    throw new Error(`문자 API 요청에 실패했습니다. (${response.status})`);
  }

  return unwrapVoteApiResponse<T>(await response.json());
}

function toSummary(response: SendSmsResponseDto): SmsDispatchSummary {
  const { smsDispatchId, ...summary } = response;
  return { ...summary, id: smsDispatchId };
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const normalizedPage = Math.max(1, Math.trunc(page));
  const normalizedPageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const offset = (normalizedPage - 1) * normalizedPageSize;

  return {
    items: items.slice(offset, offset + normalizedPageSize),
    page: normalizedPage,
    pageSize: normalizedPageSize,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / normalizedPageSize),
  };
}

function createMockDeliveries(purpose: SmsPurpose): SmsDelivery[] {
  const prefix = purpose === "VOTE_PARTICIPATION_REMINDER" ? "미참여" : "선거인";
  return [
    {
      electorId: "elector-1",
      recipientName: "이*거",
      recipientIdentifier: `${prefix}-101`,
      status: "SUCCESS",
    },
    {
      electorId: "elector-2",
      failureReason: "SIMULATED_RANDOM_FAILURE",
      recipientName: "박*참",
      recipientIdentifier: `${prefix}-102`,
      status: "FAILURE",
    },
  ];
}

export function createVoteSmsApiClient(
  options: CreateVoteSmsApiClientOptions = {},
) {
  const mode = options.mode ?? (isApiMockMode() ? "mock" : "live");
  const baseUrl = (options.baseUrl ?? resolveBaseUrl()).replace(/\/+$/, "");
  const fetcher = options.fetcher ?? voteApiFetch;
  const now = options.now ?? (() => new Date().toISOString());
  let sequence = 0;
  const mockDispatches: SmsDispatchDetail[] = [];

  function createMockDispatch(input: {
    fieldVotingSessionId?: string;
    purpose: SmsPurpose;
    voteId: string;
  }) {
    sequence += 1;
    const deliveries = createMockDeliveries(input.purpose);
    const dispatch: SmsDispatchDetail = {
      ...input,
      deliveries,
      failureCount: deliveries.filter((item) => item.status === "FAILURE").length,
      id: `sms-dispatch-${sequence}`,
      recipientCount: deliveries.length,
      page: 1,
      pageSize: deliveries.length,
      sentAt: now(),
      successCount: deliveries.filter((item) => item.status === "SUCCESS").length,
      totalItems: deliveries.length,
      totalPages: deliveries.length > 0 ? 1 : 0,
    };
    mockDispatches.unshift(dispatch);
    return dispatch;
  }

  async function sendVoteSms(
    input: SendVoteSmsInput,
  ): Promise<SmsDispatchSummary> {
    if (mode === "mock") {
      return createMockDispatch({ purpose: input.purpose, voteId: input.voteId });
    }

    return toSummary(
      await request<SendSmsResponseDto>(
        fetcher,
        baseUrl,
        `/votes/${encode(input.voteId)}/sms/${purposePaths[input.purpose]}`,
        input.purpose === "VOTE_PARTICIPATION_REMINDER"
          ? { method: "POST" }
          : { method: "POST", body: JSON.stringify({ message: input.message }) },
      ),
    );
  }

  async function fetchParticipationReminderTemplate(
    voteId: string,
  ): Promise<ParticipationReminderTemplate> {
    if (mode === "mock") {
      return {
        buttonLabel: "투표 참여하기",
        code: "VOTE_PARTICIPATION_REMINDER",
        content:
          "[전자투표]\n아직 투표에 참여하지 않으셨습니다.\n아래 버튼을 눌러 투표에 참여해 주세요.",
      };
    }

    return request<ParticipationReminderTemplate>(
      fetcher,
      baseUrl,
      `/votes/${encode(voteId)}/sms/participation-reminder/template`,
    );
  }

  async function sendFieldSessionSms(
    input: SendFieldSessionSmsInput,
  ): Promise<SmsDispatchSummary> {
    if (mode === "mock") {
      return createMockDispatch({
        fieldVotingSessionId: input.fieldVotingSessionId,
        purpose: "FIELD_VOTING_SESSION_NOTICE",
        voteId: input.voteId,
      });
    }

    return toSummary(
      await request<SendSmsResponseDto>(
        fetcher,
        baseUrl,
        `/field-voting-sessions/${encode(input.fieldVotingSessionId)}/sms`,
        { method: "POST", body: JSON.stringify({ message: input.message }) },
      ),
    );
  }

  async function fetchDispatchPage(
    voteId: string,
    page = 1,
    pageSize = 20,
  ): Promise<SmsDispatchPage> {
    if (mode === "mock") {
      return paginate(
        mockDispatches.filter((item) => item.voteId === voteId),
        page,
        pageSize,
      );
    }

    return request<SmsDispatchPage>(
      fetcher,
      baseUrl,
      `/votes/${encode(voteId)}/sms/dispatches`,
      {},
      new URLSearchParams({ page: String(page), pageSize: String(pageSize) }),
    );
  }

  async function fetchDispatch(
    voteId: string,
    dispatchId: string,
    page = 1,
    pageSize = 50,
  ) {
    if (mode === "mock") {
      const dispatch = mockDispatches.find(
        (item) => item.voteId === voteId && item.id === dispatchId,
      );
      if (!dispatch) {
        throw new Error("문자 발송 이력을 찾을 수 없습니다.");
      }
      const deliveryPage = paginate(dispatch.deliveries, page, pageSize);
      return { ...dispatch, deliveries: deliveryPage.items, ...deliveryPage };
    }

    return request<SmsDispatchDetail>(
      fetcher,
      baseUrl,
      `/votes/${encode(voteId)}/sms/dispatches/${encode(dispatchId)}`,
      {},
      new URLSearchParams({ page: String(page), pageSize: String(pageSize) }),
    );
  }

  return {
    fetchDispatch,
    fetchDispatchPage,
    fetchParticipationReminderTemplate,
    mode,
    sendFieldSessionSms,
    sendVoteSms,
  };
}

export const voteSmsApi = createVoteSmsApiClient();
