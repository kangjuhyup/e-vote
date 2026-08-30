import NextAuth, { type NextAuthConfig } from 'next-auth';

import {
  E_VOTE_CLIENT_ID,
  E_VOTE_PROVIDER_ID,
  type EVoteOidcProfile,
  getTenantOidcIssuer,
  mapEVoteProfileToUser,
} from '@/shared/auth/oidc';
import { persistVoteAccessToken } from '@/shared/auth/vote-session-token';

const eVoteClientSecret =
  process.env.AUTH_E_VOTE_SECRET ?? process.env.AUTH_E_VOTE_CLIENT_SECRET;

export const authConfig = {
  providers: [
    {
      id: E_VOTE_PROVIDER_ID,
      name: 'E-Vote',
      type: 'oidc',
      issuer: getTenantOidcIssuer(),
      idToken: false,
      clientId: E_VOTE_CLIENT_ID,
      ...(eVoteClientSecret ? { clientSecret: eVoteClientSecret } : {}),
      authorization: {
        params: {
          scope: 'openid profile email',
        },
      },
      checks: ['pkce', 'state', 'nonce'],
      client: {
        token_endpoint_auth_method: eVoteClientSecret
          ? 'client_secret_basic'
          : 'none',
      },
      profile(profile: EVoteOidcProfile) {
        return mapEVoteProfileToUser(profile);
      },
    },
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    jwt({ token, account }) {
      return persistVoteAccessToken(token, account);
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
