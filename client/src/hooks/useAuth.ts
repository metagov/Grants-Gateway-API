import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const {
    ready,
    authenticated,
    user: privyUser,
    login,
    logout,
    getAccessToken,
  } = usePrivy();

  const {
    data,
    isLoading: profileLoading,
    error,
  } = useQuery({
    queryKey: ["/api/auth/user", authenticated],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) return null;
      const res = await fetch("/api/auth/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: ready && authenticated,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ready,
    authenticated,
    privyUser,
    user: data?.user ?? null,
    registered: data?.registered ?? false,
    apiKey: data?.apiKey ?? null,
    isLoading: !ready || (authenticated && profileLoading),
    error,
    login,
    logout,
    getAccessToken,
  };
}
