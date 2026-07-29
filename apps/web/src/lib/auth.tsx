import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { roleAtLeast, type CurrentUser, type Role } from "@malkom/shared";
import { api, ApiError } from "./api";
import { IS_STATIC } from "./static";

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

const STATIC_VIEWER: CurrentUser = {
  id: "static-preview",
  email: "readonly@preview",
  name: "Read-only preview",
  role: "VIEWER",
};

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
    enabled: !IS_STATIC,
  });

  const user = IS_STATIC ? STATIC_VIEWER : (data ?? null);

  const value: AuthContextValue = {
    user,
    isLoading: IS_STATIC ? false : isLoading,
    hasRole: (min) => (user ? roleAtLeast(user.role, min) : false),
    logout: async () => {
      if (IS_STATIC) return;
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
