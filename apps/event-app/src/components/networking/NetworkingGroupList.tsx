"use client";

import { useNetworkingStore } from "@/lib/stores/networkingStore";
import { NetworkingGroupCard } from "./NetworkingGroupCard";

export function NetworkingGroupList() {
  const groups = useNetworkingStore((s) => s.groups);
  const groupsLoading = useNetworkingStore((s) => s.groupsLoading);
  const selectedGroupId = useNetworkingStore((s) => s.selectedGroupId);
  const selectGroup = useNetworkingStore((s) => s.selectGroup);

  if (groupsLoading && groups.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading groups...</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-sm font-medium text-foreground">No groups yet</p>
        <p className="text-xs text-muted-foreground">
          Create one to start networking!
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto pr-1">
      {groups.map((group) => (
        <NetworkingGroupCard
          key={group.id}
          group={group}
          isSelected={group.id === selectedGroupId}
          onSelect={() => selectGroup(group.id)}
        />
      ))}
    </div>
  );
}
