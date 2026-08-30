/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignUpContainer } from "@/features/auth/container/sign-up-container";

const queryClients: QueryClient[] = [];

function renderSignUp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });
  queryClients.push(queryClient);

  return render(
    <QueryClientProvider client={queryClient}>
      <SignUpContainer />
    </QueryClientProvider>,
  );
}

function fillRequiredFields(confirmPassword = "password123") {
  fireEvent.change(screen.getByLabelText("아이디"), {
    target: { value: "voter01" },
  });
  fireEvent.change(screen.getByLabelText("비밀번호"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("비밀번호 확인"), {
    target: { value: confirmPassword },
  });
}

describe("SignUpContainer", () => {
  afterEach(() => {
    cleanup();
    queryClients.splice(0).forEach((queryClient) => queryClient.clear());
    vi.unstubAllGlobals();
  });

  it("stops submission when password confirmation does not match", () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    renderSignUp();
    fillRequiredFields("different-password");

    fireEvent.submit(
      screen.getByRole("button", { name: "안전하게 회원가입" }).closest("form")!,
    );

    expect(
      screen.getByText("비밀번호와 비밀번호 확인이 일치하지 않습니다."),
    ).toBeTruthy();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("submits the form and shows the completion state", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetcher);
    renderSignUp();
    fillRequiredFields();

    fireEvent.submit(
      screen.getByRole("button", { name: "안전하게 회원가입" }).closest("form")!,
    );

    expect(
      await screen.findByText("회원가입이 완료되었습니다"),
    ).toBeTruthy();
    expect(fetcher).toHaveBeenCalledWith(
      "/api/registration",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "voter01",
          password: "password123",
        }),
      }),
    );
    expect(
      screen.getByRole("link", { name: "로그인하러 가기" }).getAttribute("href"),
    ).toBe("/");
  });
});
