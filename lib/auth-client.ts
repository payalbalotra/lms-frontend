'use client';

import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE ?? '', 
  plugins: [magicLinkClient()],
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  magicLink,
} = authClient