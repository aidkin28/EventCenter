import { useState, useEffect, useMemo } from "react";
import { useUserStore } from "@/lib/stores/userStore";

interface UpdateGreeting {
  greeting: string;
  question: string;
  isLoading: boolean;
}

/**
 * Hook that generates a personalized greeting and contextual question
 * based on time of day and when the user last submitted an update.
 */
export function useUpdateGreeting(): UpdateGreeting {
  const { user, isLoading: userLoading } = useUserStore();
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch most recent completed session
  useEffect(() => {
    async function fetchLastSession() {
      try {
        const res = await fetch("/api/updates/sessions?limit=1&status=completed");
        if (!res.ok) throw new Error("Failed to fetch sessions");
        const data = await res.json();
        if (data.sessions?.[0]?.endedAt) {
          setLastUpdateTime(new Date(data.sessions[0].endedAt));
        }
      } catch (e) {
        console.error("Failed to fetch last session", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLastSession();
  }, []);

  const greeting = useMemo(() => {
    const firstName = user?.name?.split(" ")[0] || "there";
    const hour = new Date().getHours();

    let timeGreeting: string;
    if (hour < 12) {
      timeGreeting = "Good morning";
    } else if (hour < 17) {
      timeGreeting = "Good afternoon";
    } else {
      timeGreeting = "Good evening";
    }

    return `${timeGreeting}, ${firstName}`;
  }, [user?.name]);

  const question = useMemo(() => {
    // No previous update - first time user
    if (!lastUpdateTime) {
      return "What have you been working on?";
    }

    const now = new Date();
    const diffMs = now.getTime() - lastUpdateTime.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    const diffHours = diffMinutes / 60;
    const diffDays = diffHours / 24;
    const currentHour = now.getHours();

    // Very recent updates (< 5 minutes)
    if (diffMinutes < 5) {
      return "What else can I record for you?";
    }

    // Recent updates (< 1 hour)
    if (diffHours < 1) {
      return "You've been busy! What else have you been working on?";
    }

    // Morning context (11am - 2pm) with update from earlier today
    if (diffHours < 14 && currentHour >= 11 && currentHour < 14) {
      return "What did you work on this morning?";
    }

    // Evening context (5pm+) with afternoon update
    if (diffHours < 5 && currentHour >= 17) {
      return "What did you work on this afternoon?";
    }

    // Evening context with earlier today update
    if (diffHours < 16 && currentHour >= 17) {
      return "What did you work on today?";
    }

    // Evening until midnight with update from today
    if (diffHours < 24 && currentHour >= 17) {
      return "What did you work on today?";
    }

    // Morning with update from yesterday
    if (diffHours < 24 && currentHour < 12) {
      return "What did you work on yesterday?";
    }

    // 1-6 days ago
    if (diffDays < 7) {
      const days = Math.ceil(diffDays);
      return `What have you been up to the past ${days} days?`;
    }

    // About a week ago
    if (diffDays < 10) {
      return "What have you been up to this past week?";
    }

    // About two weeks ago
    if (diffDays < 18) {
      return "What have you been up to the past couple weeks?";
    }

    // About a month ago
    if (diffDays < 45) {
      return "What have you been up to this past month?";
    }

    // Multiple months
    const months = Math.round(diffDays / 30);
    if (months <= 16) {
      return `What have you been up to the past ${months} months?`;
    }

    // Very long time or edge cases
    return "What's an overall update? Focus on what's recent.";
  }, [lastUpdateTime]);

  return {
    greeting,
    question,
    isLoading: userLoading || isLoading,
  };
}
