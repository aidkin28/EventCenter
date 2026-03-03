"use client";

import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNetworkingStore } from "@/lib/stores/networkingStore";
import { useNetworkingPolling } from "@/hooks/useNetworkingPolling";
import { NetworkingGroupList } from "./NetworkingGroupList";
import { NetworkingChat } from "./NetworkingChat";
import { AISummaryPanel } from "./AISummaryPanel";
import { MindMap } from "./MindMap";
import { cn } from "@/lib/utils";

export function NetworkingLayout() {
  const selectedGroupId = useNetworkingStore((s) => s.selectedGroupId);
  const selectGroup = useNetworkingStore((s) => s.selectGroup);
  const isMember = useNetworkingStore((s) => s.isMember);

  useNetworkingPolling();

  // Fetch group detail + membership when selected
  useEffect(() => {
    if (!selectedGroupId) return;
    fetch(`/api/networking/groups/${selectedGroupId}`)
      .then((r) => r.json())
      .then((data) => {
        useNetworkingStore.getState().setIsMember(data.isMember ?? false);
      })
      .catch(() => {});
  }, [selectedGroupId]);

  const showGroupDetail = !!selectedGroupId;

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* Group List - always visible on lg+, conditionally on mobile */}
      <div
        className={cn(
          "w-full flex-shrink-0 lg:w-[280px]",
          showGroupDetail && "hidden lg:block"
        )}
      >
        <NetworkingGroupList />
      </div>

      {/* Center + Right panels */}
      {showGroupDetail && (
        <>
          {/* Mobile back button */}
          <button
            onClick={() => selectGroup(null)}
            className="fixed top-20 left-4 z-30 flex items-center gap-1 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-muted-foreground shadow-sm lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {/* Center: Word Cloud + AI Summary + Mind Map */}
          <div className="hidden flex-1 flex-col gap-4 overflow-hidden lg:flex">
            <div className="h-[45%] overflow-auto rounded-xl border border-border bg-white p-4">
              <AISummaryPanel />
            </div>
            <div className="flex-1 overflow-hidden rounded-xl border border-border bg-white p-4">
              <MindMap />
            </div>
          </div>

          {/* Right: Chat Panel */}
          <div className="flex w-full flex-col lg:w-[340px] lg:flex-shrink-0">
            <div className="flex-1 overflow-hidden rounded-xl border border-border bg-white">
              <NetworkingChat />
            </div>
            {/* Mobile: stacked mind map below chat */}
            <div className="mt-4 h-[300px] overflow-hidden rounded-xl border border-border bg-white p-4 lg:hidden">
              <MindMap />
            </div>
          </div>
        </>
      )}

      {/* Empty state when no group selected on desktop */}
      {!showGroupDetail && (
        <div className="hidden flex-1 items-center justify-center lg:flex">
          <p className="text-sm text-muted-foreground">
            Select a group to start networking
          </p>
        </div>
      )}
    </div>
  );
}
