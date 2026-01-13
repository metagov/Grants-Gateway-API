import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function useAuth() {
  const { ready, authenticated, user: privyUser, login, logout } = usePrivy();

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

  return {
    user,
    privyUser,
    isLoading: !ready || (authenticated && backendLoading),
    isAuthenticated: authenticated && !!privyUser,
    login,
    logout,
    ready,
  };
}
