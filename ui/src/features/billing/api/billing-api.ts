import { isApiMockMode } from "@/shared/config/api-mode";
import { voteApiFetch } from "@/shared/auth/vote-api-fetch";

import { unwrapVoteApiResponse } from "@/features/votes/api/votes-api";
import { voteFixtureDetails } from "@/features/votes/api/votes-fixtures";

import type {
  BillingOrder,
  CancelBillingOrderInput,
} from "../model/billing.types";

type ApiFetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface CreateBillingApiClientOptions {
  baseUrl?: string;
  fetcher?: ApiFetcher;
  mode?: "live" | "mock";
  now?: () => string;
}

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

async function request<T>(
  fetcher: ApiFetcher,
  baseUrl: string,
  path: string,
  init: RequestInit = {},
  accessDeniedMessage = "이 결제 주문을 관리할 권한이 없습니다.",
) {
  if (baseUrl.length === 0) {
    throw new Error("NEXT_PUBLIC_VOTE_API_BASE_URL is required in live mode");
  }

  const response = await fetcher(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 400) {
      throw new Error("결제 요청 내용을 확인해 주세요.");
    }
    if (response.status === 403) {
      throw new Error(accessDeniedMessage);
    }
    if (response.status === 404) {
      throw new Error("결제 주문 또는 연결된 투표를 찾을 수 없습니다.");
    }
    if (response.status === 409) {
      throw new Error("현재 투표 또는 주문 상태에서는 요청을 처리할 수 없습니다.");
    }
    throw new Error(`결제 API 요청에 실패했습니다. (${response.status})`);
  }

  return unwrapVoteApiResponse<T>(await response.json());
}

export function createBillingApiClient(
  options: CreateBillingApiClientOptions = {},
) {
  const mode = options.mode ?? (isApiMockMode() ? "mock" : "live");
  const baseUrl = (options.baseUrl ?? resolveBaseUrl()).replace(/\/+$/, "");
  const fetcher = options.fetcher ?? voteApiFetch;
  const now = options.now ?? (() => new Date().toISOString());
  const mockOrders = new Map<string, BillingOrder>();
  const mockOrderIdByVoteId = new Map<string, string>();
  const mockFetchCountByOrderId = new Map<string, number>();
  let sequence = 0;

  async function createVoteUsageOrder(voteId: string): Promise<BillingOrder> {
    if (mode === "mock") {
      const existingId = mockOrderIdByVoteId.get(voteId);
      const existingOrder = existingId ? mockOrders.get(existingId) : undefined;
      if (
        existingOrder &&
        existingOrder.status !== "CANCELED" &&
        existingOrder.status !== "REFUNDED"
      ) {
        return existingOrder;
      }

      sequence += 1;
      const issuedAt = now();
      const order: BillingOrder = {
        amount: 3_000,
        baseAmount: 3_000,
        blockchainStorageAmount: 0,
        blockchainStorageCount: 0,
        blockchainStorageUnitPrice: 3_000,
        cancelableUntil: new Date(
          new Date(issuedAt).getTime() + 7 * 86_400_000,
        ).toISOString(),
        cancellationWindowDays: 7,
        currency: "KRW",
        electorCount: 3,
        id: `billing-order-${sequence}`,
        issuedAt,
        orderedByUserPrincipalId: "mock-user-principal",
        pricingUnitCount: 1,
        pricingUnitSize: 100,
        productCode: "VOTE_USAGE",
        productName: "투표 개설 이용료",
        status: "PENDING_PAYMENT",
        unitPrice: 3_000,
        voteId,
      };
      mockOrders.set(order.id, order);
      mockOrderIdByVoteId.set(voteId, order.id);
      mockFetchCountByOrderId.set(order.id, 0);
      const vote = voteFixtureDetails.find((item) => item.id === voteId);
      if (vote) {
        vote.activeBillingOrderId = order.id;
        vote.billingOrderStatus = "PENDING_PAYMENT";
      }
      return order;
    }

    return request<BillingOrder>(
      fetcher,
      baseUrl,
      "/billing/vote-usage-orders",
      { method: "POST", body: JSON.stringify({ voteId }) },
      "투표 생성자만 새 결제 주문을 만들 수 있고, 기존 주문은 주문 생성자만 다시 요청할 수 있습니다. 생성자 정보가 없는 기존 투표는 운영자 보정 전까지 결제할 수 없습니다.",
    );
  }

  async function fetchVoteUsageOrder(
    billingOrderId: string,
  ): Promise<BillingOrder> {
    if (mode === "mock") {
      const order = mockOrders.get(billingOrderId);
      if (!order) throw new Error("결제 주문을 찾을 수 없습니다.");
      if (
        order.status === "PENDING_PAYMENT" ||
        order.status === "REFUND_PENDING"
      ) {
        const fetchCount = (mockFetchCountByOrderId.get(order.id) ?? 0) + 1;
        mockFetchCountByOrderId.set(order.id, fetchCount);
        if (fetchCount >= 2) {
          const transitioned: BillingOrder =
            order.status === "PENDING_PAYMENT"
              ? {
                  ...order,
                  paidAt: now(),
                  paymentId: `mock-payment-${order.id}`,
                  status: "PAID",
                }
              : { ...order, refundedAt: now(), status: "REFUNDED" };
          mockOrders.set(order.id, transitioned);
          const vote = voteFixtureDetails.find(
            (item) => item.id === order.voteId,
          );
          if (vote) {
            vote.status = transitioned.status === "PAID" ? "finalized" : "draft";
            if (transitioned.status === "PAID") {
              vote.activeBillingOrderId = transitioned.id;
              vote.billingOrderStatus = "PAID";
            } else {
              delete vote.activeBillingOrderId;
              delete vote.billingOrderStatus;
            }
          }
          return transitioned;
        }
      }
      return order;
    }

    return request<BillingOrder>(
      fetcher,
      baseUrl,
      `/billing/vote-usage-orders/${encode(billingOrderId)}`,
      {},
      "결제 주문을 생성한 사용자만 이 주문을 조회할 수 있습니다.",
    );
  }

  async function cancelVoteUsageOrder(
    input: CancelBillingOrderInput,
  ): Promise<BillingOrder> {
    if (mode === "mock") {
      const order = mockOrders.get(input.billingOrderId);
      if (!order) throw new Error("결제 주문을 찾을 수 없습니다.");
      if (order.status !== "PENDING_PAYMENT" && order.status !== "PAID") {
        throw new Error("현재 주문 상태에서는 취소할 수 없습니다.");
      }
      const canceled: BillingOrder = {
        ...order,
        canceledAt: now(),
        cancellationReason: input.reason,
        ...(order.status === "PAID" ? { refundRequestedAt: now() } : {}),
        status: order.status === "PAID" ? "REFUND_PENDING" : "CANCELED",
      };
      mockOrders.set(canceled.id, canceled);
      mockFetchCountByOrderId.set(canceled.id, 0);
      if (canceled.status === "CANCELED") {
        const vote = voteFixtureDetails.find(
          (item) => item.id === canceled.voteId,
        );
        if (vote) {
          vote.status = "draft";
          delete vote.activeBillingOrderId;
          delete vote.billingOrderStatus;
        }
      } else {
        const vote = voteFixtureDetails.find(
          (item) => item.id === canceled.voteId,
        );
        if (vote) {
          vote.activeBillingOrderId = canceled.id;
          vote.billingOrderStatus = "REFUND_PENDING";
        }
      }
      return canceled;
    }

    return request<BillingOrder>(
      fetcher,
      baseUrl,
      `/billing/vote-usage-orders/${encode(input.billingOrderId)}/cancellation`,
      { method: "POST", body: JSON.stringify({ reason: input.reason }) },
      "결제 주문을 생성한 사용자만 이 주문을 취소할 수 있습니다.",
    );
  }

  return {
    cancelVoteUsageOrder,
    createVoteUsageOrder,
    fetchVoteUsageOrder,
    mode,
  };
}

export const billingApi = createBillingApiClient();
