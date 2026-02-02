import { useEffect } from "react";
import { create } from "zustand";
import { authClient } from "../auth-client";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
  role?: string;
  activeTeamId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  timeZone: string;
  lastFetched: number | null;
  fetchUser: (force?: boolean) => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  clearUser: () => void;
  signOut: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  timeZone: typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
  lastFetched: null,

  fetchUser: async (force = false) => {
    const { user, lastFetched, isLoading } = get();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Only skip if we have a user, it's fresh, and we aren't forcing a refresh
    if (!force && user && lastFetched && (now - lastFetched < fiveMinutes)) {
      if (isLoading) set({ isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const session = await authClient.getSession();
      console.log("\n\n\n\nsession", session);

      if (session?.data?.user) {
        // Better-auth has the session, now fetch the full profile to get role and activeTeamId
        // This ensures the data is always synced with the database
        const safeUser = await fetch("/api/users/getUserSafeColumns").then(res => res.json());

        const userData: User = {
					...(session.data.user as User),
					role: safeUser.role,
					activeTeamId: safeUser.activeTeamId,
				};

        set({
          user: userData,
          isAuthenticated: true,
          isLoading: false,
          lastFetched: Date.now(),
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          lastFetched: Date.now(),
        });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        lastFetched: null,
      });
    }
  },

  updateUser: (data) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, ...data } });
    }
  },

  clearUser: () => {
    set({ user: null, isAuthenticated: false, lastFetched: null });
  },

  signOut: async () => {
    try {
      await authClient.signOut();
      set({ user: null, isAuthenticated: false, lastFetched: null });
      // Redirect to signin page
      if (typeof window !== "undefined") {
        window.location.href = "/auth/signin";
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  },
}));

// Hook to initialize user on app load
export const useInitializeUser = () => {
  const fetchUser = useUserStore((state) => state.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);
};
