"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { UpdateWizard } from "@/components/updates/UpdateWizard";
import { PendingFollowUpsSidebar } from "@/components/updates/PendingFollowUpsSidebar";
import { UserTodosSidebar } from "@/components/updates/UserTodosSidebar";
import { useUpdateGreeting } from "@/src/hooks/useUpdateGreeting";
import { Button } from "@common/components/ui/Button";
import { IconClipboardText, IconHistory } from "@tabler/icons-react";

function UpdatePageContent() {
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get("session");
  const { greeting, question, isLoading } = useUpdateGreeting();
  const [selectedDate, setSelectedDate] = useState<string>("");

  const dateContext = useMemo(() => {
    if (!selectedDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selected = new Date(selectedDate + "T00:00:00");
    const diffTime = today.getTime() - selected.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return null; // Today - use normal question
    } else if (diffDays === 1) {
      return "Logging for yesterday";
    } else {
      // Format as "January 15"
      const formatted = selected.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });
      return `Logging for ${formatted}`;
    }
  }, [selectedDate]);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="rounded-lg bg-primary/10 p-2.5">
          <IconClipboardText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Daily Update</h1>
          <p className="text-muted-foreground">
            {isLoading ? (
              "Log your activities and track your progress"
            ) : (
              <>
                {greeting}! {dateContext || question}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="flex gap-6">
        {/* Wizard */}
        <UpdateWizard
          className="flex-1 max-w-2xl"
          onDateChange={setSelectedDate}
          initialSessionId={initialSessionId}
        />

        {/* Right sidebar - hidden on mobile */}
        <aside className="w-80 shrink-0 hidden lg:block">
          {/* History button - standalone, matches settings bar height */}
          <Button
            asChild
            variant="outline"
            className="w-full mb-4 h-[52px] justify-start gap-3"
            innerClassName="flex gap-x-2"
          >
            <Link href="/update/history" className="flex gap-x-2 items-center text-sm font-medium">
              <IconHistory className="h-4.5 w-4.5 text-primary" />
              <span>View Update History</span>
            </Link>
          </Button>

          {/* Sidebar cards */}
          <div className="space-y-4">
            <PendingFollowUpsSidebar />
            <UserTodosSidebar />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function UpdatePage() {
  return (
    <Suspense fallback={<div className="container py-8">Loading...</div>}>
      <UpdatePageContent />
    </Suspense>
  );
}
