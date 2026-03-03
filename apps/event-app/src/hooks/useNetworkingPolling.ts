import { useEffect, useRef } from "react";
import { useNetworkingStore } from "@/lib/stores/networkingStore";

const GROUPS_POLL_MS = 30_000;
const MESSAGES_POLL_MS = 3_000;
const MINDMAP_POLL_MS = 5_000;

export function useNetworkingPolling() {
  const selectedGroupId = useNetworkingStore((s) => s.selectedGroupId);
  const isMember = useNetworkingStore((s) => s.isMember);
  const setGroups = useNetworkingStore((s) => s.setGroups);
  const setGroupsLoading = useNetworkingStore((s) => s.setGroupsLoading);
  const appendMessages = useNetworkingStore((s) => s.appendMessages);
  const setMessages = useNetworkingStore((s) => s.setMessages);
  const setMessagesLoading = useNetworkingStore((s) => s.setMessagesLoading);
  const setMindMapNodes = useNetworkingStore((s) => s.setMindMapNodes);
  const setMindMapLoading = useNetworkingStore((s) => s.setMindMapLoading);

  const latestTimestampRef = useRef<string | null>(null);
  const initialLoadDoneRef = useRef(false);

  // Poll groups list
  useEffect(() => {
    let active = true;

    async function fetchGroups() {
      try {
        setGroupsLoading(true);
        const res = await fetch("/api/networking/groups");
        if (res.ok && active) {
          const data = await res.json();
          setGroups(data);
        }
      } catch {
        // ignore
      } finally {
        if (active) setGroupsLoading(false);
      }
    }

    fetchGroups();
    const interval = setInterval(fetchGroups, GROUPS_POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [setGroups, setGroupsLoading]);

  // Reset state when group changes
  useEffect(() => {
    latestTimestampRef.current = null;
    initialLoadDoneRef.current = false;
  }, [selectedGroupId]);

  // Poll messages for active group
  useEffect(() => {
    if (!selectedGroupId || !isMember) return;
    let active = true;

    async function fetchMessages() {
      try {
        if (!initialLoadDoneRef.current) {
          setMessagesLoading(true);
        }

        const afterParam = latestTimestampRef.current
          ? `?after=${encodeURIComponent(latestTimestampRef.current)}`
          : "";

        const res = await fetch(
          `/api/networking/groups/${selectedGroupId}/messages${afterParam}`
        );

        if (res.ok && active) {
          const data = await res.json();
          if (data.length > 0) {
            if (!initialLoadDoneRef.current) {
              setMessages(data);
              initialLoadDoneRef.current = true;
            } else {
              appendMessages(data);
            }
            // Update latest timestamp from last message
            const last = data[data.length - 1];
            if (last?.createdAt) {
              latestTimestampRef.current = last.createdAt;
            }
          } else if (!initialLoadDoneRef.current) {
            setMessages([]);
            initialLoadDoneRef.current = true;
          }
        }
      } catch {
        // ignore
      } finally {
        if (active) setMessagesLoading(false);
      }
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, MESSAGES_POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedGroupId, isMember, setMessages, appendMessages, setMessagesLoading]);

  // Poll mind map nodes for active group
  useEffect(() => {
    if (!selectedGroupId || !isMember) return;
    let active = true;

    async function fetchMindMap() {
      try {
        setMindMapLoading(true);
        const res = await fetch(
          `/api/networking/groups/${selectedGroupId}/mindmap`
        );
        if (res.ok && active) {
          const data = await res.json();
          setMindMapNodes(data);
        }
      } catch {
        // ignore
      } finally {
        if (active) setMindMapLoading(false);
      }
    }

    fetchMindMap();
    const interval = setInterval(fetchMindMap, MINDMAP_POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedGroupId, isMember, setMindMapNodes, setMindMapLoading]);
}
