import type { Session } from "next-auth";

import { isApiMockMode } from "@/shared/config/api-mode";

import { auth } from "./auth";

const mockSession: Session = {
  user: {
    name: "Mock 관리자",
    email: "mock-admin@example.local",
    image: null,
  },
  expires: "9999-12-31T23:59:59.999Z",
};

export async function getAppSession() {
  if (isApiMockMode()) {
    return mockSession;
  }

  return auth();
}
