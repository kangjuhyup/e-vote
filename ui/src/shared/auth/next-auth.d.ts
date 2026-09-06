import 'next-auth';

import type { VoteApiAuthStatus } from '@/shared/auth/vote-session-token';

declare module 'next-auth' {
  interface Session {
    voteApiAuthStatus?: VoteApiAuthStatus;
  }
}
