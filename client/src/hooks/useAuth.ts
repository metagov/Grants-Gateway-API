import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function useAuth() {
  const { ready, authenticated, user: privyUser, login, logout } = usePrivy();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!ready) {
      const timer = setTimeout(() => {
        console.warn('Privy auth timed out - may not be configured for this domain');
        setTimedOut(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [ready]);

  const { data: backendUser, isLoading: backendLoading, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: authenticated && ready,
  });

  useEffect(() => {
    if (authenticated && ready && privyUser) {
      refetch();
    }
  }, [authenticated, ready, privyUser, refetch]);

  const user = authenticated && privyUser ? {
    id: privyUser.id,
    email: privyUser.email?.address || privyUser.wallet?.address || '',
    firstName: '',
    lastName: '',
    profileImageUrl: undefined,
    ...(typeof backendUser === 'object' && backendUser !== null ? backendUser : {}),
  } : null;

  const effectiveReady = ready || timedOut;

  return {
    user,
    privyUser,
    isLoading: !effectiveReady || (authenticated && backendLoading),
    isAuthenticated: authenticated && !!privyUser,
    login,
    logout,
    ready: effectiveReady,
    authError: timedOut && !ready,
  };
}
