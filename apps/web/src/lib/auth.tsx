import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { roleAtLeast, type CurrentUser, type Role } from "@malkom/shared";
import { api, ApiError } from "./api";

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  hasRole: (min: Role) => boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  hasRole: () => false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await api.get<CurrentUser>("/auth/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
  });

  const user = data ?? null;

  const value: AuthContextValue = {
    user,
    isLoading,
    hasRole: (min) => (user ? roleAtLeast(user.role, min) : false),
    logout: async () => {
      await api.post("/auth/logout");
      queryClient.setQueryData(["auth", "me"], null);
      window.location.href = "/login";
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
