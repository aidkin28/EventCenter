"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChatSessionAccordion,
  type ChatSessionData,
} from "@/components/updates/ChatSessionAccordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IconHistory, IconLoader2, IconInbox } from "@tabler/icons-react";

interface SessionsResponse {
  sessions: ChatSessionData[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

function SessionSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}

export default function UpdateHistoryPage() {
  const [sessions, setSessions] = useState<ChatSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async (currentOffset: number) => {
    try {
      const isInitialLoad = currentOffset === 0;
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(
        `/api/updates/sessions?limit=10&offset=${currentOffset}&status=completed`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }

      const data: SessionsResponse = await response.json();

      if (isInitialLoad) {
        setSessions(data.sessions);
      } else {
        setSessions((prev) => [...prev, ...data.sessions]);
      }

      setHasMore(data.pagination.hasMore);
      setOffset(currentOffset + data.sessions.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions(0);
  }, [fetchSessions]);

  const handleLoadMore = () => {
    fetchSessions(offset);
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="rounded-lg bg-primary/10 p-2.5">
          <IconHistory className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Update History</h1>
          <p className="text-muted-foreground">
            Review your past chat sessions and extracted activities
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <SessionSkeleton />
          <SessionSkeleton />
          <SessionSkeleton />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => fetchSessions(0)}
          >
            Try again
          </Button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <IconInbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No sessions yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Your completed update sessions will appear here. Start by logging
            your daily activities.
          </p>
          <Button className="mt-4" asChild>
            <a href="/update">Log Update</a>
          </Button>
        </div>
      ) : (
        <>
          <ChatSessionAccordion sessions={sessions} />

          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
