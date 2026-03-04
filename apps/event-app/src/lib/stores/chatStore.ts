import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export type WidgetState = "collapsed" | "hover" | "expanded";

interface ChatState {
  messages: ChatMessage[];
  widgetState: WidgetState;
  isLoading: boolean;
  error: string | null;

  setWidgetState: (state: WidgetState) => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  widgetState: "collapsed",
  isLoading: false,
  error: null,

  setWidgetState: (widgetState) => set({ widgetState }),

  sendMessage: async (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      widgetState: "expanded",
      isLoading: true,
      error: null,
    }));

    try {
      const { messages } = get();
      const history = messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Request failed" }));
        throw new Error(err.message || `Error ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  },

  clearChat: () => set({ messages: [], error: null }),
}));
