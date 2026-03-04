import { create } from "zustand";

export interface EventData {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  venue: string | null;
  location: string | null;
}

interface EventState {
  currentEvent: EventData | null;
  userEvents: EventData[];
  isLoading: boolean;
  pendingSwitch: EventData | null;

  fetchUserEvents: () => Promise<void>;
  switchEvent: (eventId: string) => Promise<void>;
  dismissPendingSwitch: () => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  currentEvent: null,
  userEvents: [],
  isLoading: true,
  pendingSwitch: null,

  fetchUserEvents: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/events/mine");
      if (!res.ok) {
        set({ isLoading: false });
        return;
      }
      const data = await res.json();
      const events: EventData[] = data.events;
      const currentEventId: string | null = data.currentEventId;

      let current = events.find((e) => e.id === currentEventId) ?? null;

      // Auto-set logic: if no current event and user has events, pick the first upcoming/current
      if (!current && events.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const upcoming = events.find((e) => e.endDate >= today);
        const target = upcoming ?? events[events.length - 1];
        // Set on the server
        const setRes = await fetch("/api/events/current", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: target.id }),
        });
        if (setRes.ok) {
          current = target;
        }
      }

      // Check if current event has ended and there's a next event
      let pendingSwitch: EventData | null = null;
      if (current) {
        const today = new Date().toISOString().split("T")[0];
        if (current.endDate < today) {
          const nextEvent = events.find((e) => e.endDate >= today && e.id !== current!.id);
          if (nextEvent) {
            pendingSwitch = nextEvent;
          }
        }
      }

      set({
        userEvents: events,
        currentEvent: current,
        pendingSwitch,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  switchEvent: async (eventId: string) => {
    const { userEvents } = get();
    try {
      const res = await fetch("/api/events/current", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (res.ok) {
        const target = userEvents.find((e) => e.id === eventId) ?? null;
        set({ currentEvent: target, pendingSwitch: null });
      }
    } catch {
      // ignore
    }
  },

  dismissPendingSwitch: () => set({ pendingSwitch: null }),
}));
