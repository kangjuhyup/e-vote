import NextAuth, { type NextAuthConfig } from 'next-auth';

import {
  createEVoteOidcProvider,
} from '@/shared/auth/oidc';
import { refreshVoteAccessToken } from '@/shared/auth/refresh-vote-access-token';
import { revokeVoteRefreshToken } from '@/shared/auth/revoke-vote-refresh-token';
import {
  getVoteApiAuthStatus,
  invalidateVoteSessionToken,
  persistVoteAccessToken,
} from '@/shared/auth/vote-session-token';

export const authConfig = {
  providers: [createEVoteOidcProvider()],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, account, trigger, session }) {
      if (account) {
        return persistVoteAccessToken(token, account);
      }

      if (
        trigger === 'update' &&
        typeof session === 'object' &&
        session !== null &&
        'refreshVoteAccessToken' in session &&
        session.refreshVoteAccessToken === true
      ) {
        try {
          return await refreshVoteAccessToken(token);
        } catch {
          return invalidateVoteSessionToken(token);
        }
      }

      return token;
    },
    session({ session, token }) {
      session.voteApiAuthStatus = getVoteApiAuthStatus(token);
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ('token' in message) {
        await revokeVoteRefreshToken(message.token).catch(() => undefined);
      }
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
