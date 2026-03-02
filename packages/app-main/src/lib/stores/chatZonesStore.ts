/**
 * Chat Zones Store
 *
 * Zustand store for managing user placements on topic zones.
 * Persists to localStorage so placements survive refresh.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserPlacementData } from "@/src/components/chat-zones/chatZonesUtils";

interface ChatZonesState {
  placements: UserPlacementData[];
  myPlacement: UserPlacementData | null;

  placeUser: (placement: Omit<UserPlacementData, "id" | "placedAt" | "offsetX" | "offsetY">) => void;
  removeMyPlacement: () => void;
  updateNote: (note: string) => void;
}

export const useChatZonesStore = create<ChatZonesState>()(
  persist(
    (set, get) => ({
      placements: [],
      myPlacement: null,

      placeUser: (data) => {
        const placement: UserPlacementData = {
          ...data,
          id: crypto.randomUUID(),
          placedAt: Date.now(),
          offsetX: 0.2 + Math.random() * 0.6,
          offsetY: 0.3 + Math.random() * 0.4,
        };

        const state = get();
        // Remove existing placement if user switches zones
        const filtered = state.placements.filter((p) => p.userId !== data.userId);

        set({
          placements: [...filtered, placement],
          myPlacement: placement,
        });
      },

      removeMyPlacement: () => {
        const state = get();
        if (!state.myPlacement) return;
        set({
          placements: state.placements.filter((p) => p.id !== state.myPlacement!.id),
          myPlacement: null,
        });
      },

      updateNote: (note) => {
        const state = get();
        if (!state.myPlacement) return;
        const updated = { ...state.myPlacement, note };
        set({
          myPlacement: updated,
          placements: state.placements.map((p) =>
            p.id === updated.id ? updated : p
          ),
        });
      },
    }),
    {
      name: "chat-zones-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
