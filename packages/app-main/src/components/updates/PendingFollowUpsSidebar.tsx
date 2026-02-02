"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@common/components/ui/Button";
import { Badge } from "@/src/components/ui/badge";
import { Skeleton } from "@/src/components/ui/skeleton";
import { FollowUpItem, type FollowUp } from "./FollowUpItem";
import { IconBellRinging, IconInbox } from "@tabler/icons-react";
import { cn } from "@/src/lib/utils";

interface PendingFollowUpsSidebarProps {
  className?: string;
}

export function PendingFollowUpsSidebar({ className }: PendingFollowUpsSidebarProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowUps = useCallback(async () => {
    try {
      const response = await fetch("/api/updates/follow-ups");
      if (!response.ok) {
        throw new Error("Failed to fetch follow-ups");
      }
      const data = await response.json();
      setFollowUps(data.followUps || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching follow-ups:", err);
      setError("Failed to load follow-ups");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  const handleMarkComplete = useCallback(async (followUpId: string) => {
    try {
      const response = await fetch("/api/updates/follow-ups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUpId,
          status: "completed",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update follow-up");
      }

      // Remove from local state
      setFollowUps((prev) => prev.filter((fu) => fu.id !== followUpId));
    } catch (err) {
      console.error("Error completing follow-up:", err);
      // Optionally show a toast notification here
    }
  }, []);

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="ghost" size="sm" onClick={fetchFollowUps} className="mt-2">
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <IconBellRinging className="h-4 w-4 text-primary" />
            Pending Follow-ups
          </span>
          {followUps.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {followUps.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Follow-ups List */}
        {followUps.length === 0 ? (
          <div className="py-6 text-center">
            <IconInbox className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No pending follow-ups
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Follow-up reminders from your updates will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {followUps.map((followUp) => (
              <FollowUpItem
                key={followUp.id}
                followUp={followUp}
                onMarkComplete={handleMarkComplete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
