"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useNetworkingStore, type MindMapNode } from "@/lib/stores/networkingStore";
import { MindMapNodeInput } from "./MindMapNodeInput";
import { cn } from "@/lib/utils";

interface DragState {
  nodeId: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
}

export function MindMap() {
  const selectedGroupId = useNetworkingStore((s) => s.selectedGroupId);
  const nodes = useNetworkingStore((s) => s.mindMapNodes);
  const isMember = useNetworkingStore((s) => s.isMember);
  const updateMindMapNode = useNetworkingStore((s) => s.updateMindMapNode);
  const addMindMapNode = useNetworkingStore((s) => s.addMindMapNode);
  const removeMindMapNode = useNetworkingStore((s) => s.removeMindMapNode);

  const [creatingFor, setCreatingFor] = useState<string | null>(null); // parentId or "root"
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // SVG viewBox pan
  const [viewBox, setViewBox] = useState({ x: -400, y: -300, w: 800, h: 600 });

  // Fit viewBox to nodes
  useEffect(() => {
    if (nodes.length === 0) {
      setViewBox({ x: -400, y: -300, w: 800, h: 600 });
      return;
    }
    const padding = 200;
    const xs = nodes.map((n) => n.positionX);
    const ys = nodes.map((n) => n.positionY);
    const minX = Math.min(...xs) - padding;
    const maxX = Math.max(...xs) + padding;
    const minY = Math.min(...ys) - padding;
    const maxY = Math.max(...ys) + padding;
    setViewBox({
      x: minX,
      y: minY,
      w: Math.max(maxX - minX, 400),
      h: Math.max(maxY - minY, 300),
    });
  }, [nodes]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, node: MindMapNode) => {
      if (!isMember) return;
      e.stopPropagation();
      setSelectedNode(node.id);
      setDragState({
        nodeId: node.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: node.positionX,
        origY: node.positionY,
      });
    },
    [isMember]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState || !svgRef.current) return;
      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      const scaleX = viewBox.w / rect.width;
      const scaleY = viewBox.h / rect.height;
      const dx = (e.clientX - dragState.startX) * scaleX;
      const dy = (e.clientY - dragState.startY) * scaleY;
      updateMindMapNode(dragState.nodeId, {
        positionX: dragState.origX + dx,
        positionY: dragState.origY + dy,
      });
    },
    [dragState, viewBox, updateMindMapNode]
  );

  const handleMouseUp = useCallback(async () => {
    if (!dragState || !selectedGroupId) {
      setDragState(null);
      return;
    }
    const node = nodes.find((n) => n.id === dragState.nodeId);
    if (node) {
      // Persist position
      await fetch(
        `/api/networking/groups/${selectedGroupId}/mindmap/${dragState.nodeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positionX: node.positionX,
            positionY: node.positionY,
          }),
        }
      ).catch(() => {});
    }
    setDragState(null);
  }, [dragState, nodes, selectedGroupId]);

  async function handleCreateNode(label: string, parentId: string | null) {
    if (!selectedGroupId) return;
    try {
      const res = await fetch(
        `/api/networking/groups/${selectedGroupId}/mindmap`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, parentId }),
        }
      );
      if (res.ok) {
        const node = await res.json();
        addMindMapNode(node);
      }
    } catch {
      // ignore
    }
    setCreatingFor(null);
  }

  async function handleDeleteNode(nodeId: string) {
    if (!selectedGroupId) return;
    try {
      const res = await fetch(
        `/api/networking/groups/${selectedGroupId}/mindmap/${nodeId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        removeMindMapNode(nodeId);
        setSelectedNode(null);
      }
    } catch {
      // ignore
    }
  }

  if (!isMember) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Join the group to collaborate on the mind map
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-foreground">Mind Map</h4>
        <button
          onClick={() => setCreatingFor("root")}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/[0.06] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Root
        </button>
      </div>

      {/* Inline input for creating root node */}
      {creatingFor === "root" && (
        <div className="mb-2">
          <MindMapNodeInput
            onSubmit={(label) => handleCreateNode(label, null)}
            onCancel={() => setCreatingFor(null)}
          />
        </div>
      )}

      {/* SVG Canvas */}
      <div className="flex-1 overflow-hidden rounded-lg border border-border/50 bg-secondary/30">
        {nodes.length === 0 && !creatingFor ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-muted-foreground">
              Add a root node to get started
            </p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            className="h-full w-full"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Edges */}
            {nodes
              .filter((n) => n.parentId)
              .map((node) => {
                const parent = nodes.find((p) => p.id === node.parentId);
                if (!parent) return null;
                return (
                  <line
                    key={`edge-${node.id}`}
                    x1={parent.positionX}
                    y1={parent.positionY}
                    x2={node.positionX}
                    y2={node.positionY}
                    stroke="var(--border)"
                    strokeWidth="2"
                  />
                );
              })}

            {/* Nodes */}
            {nodes.map((node) => (
              <g
                key={node.id}
                onMouseDown={(e) => handleMouseDown(e, node)}
                style={{ cursor: dragState?.nodeId === node.id ? "grabbing" : "grab" }}
              >
                {/* Circle */}
                <circle
                  cx={node.positionX}
                  cy={node.positionY}
                  r={node.parentId ? 35 : 45}
                  fill={
                    selectedNode === node.id
                      ? "rgba(220, 38, 38, 0.12)"
                      : node.parentId
                      ? "white"
                      : "rgba(220, 38, 38, 0.06)"
                  }
                  stroke={
                    selectedNode === node.id
                      ? "var(--primary)"
                      : "var(--border)"
                  }
                  strokeWidth={selectedNode === node.id ? 2 : 1}
                />
                {/* Label */}
                <text
                  x={node.positionX}
                  y={node.positionY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="select-none pointer-events-none"
                  fill="var(--foreground)"
                  fontSize={node.parentId ? 10 : 12}
                  fontWeight={node.parentId ? 400 : 600}
                >
                  {node.label.length > 20
                    ? node.label.slice(0, 18) + "..."
                    : node.label}
                </text>

                {/* Add child button */}
                <g
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreatingFor(node.id);
                    setSelectedNode(node.id);
                  }}
                  className="cursor-pointer"
                >
                  <circle
                    cx={node.positionX + (node.parentId ? 30 : 40)}
                    cy={node.positionY - (node.parentId ? 25 : 35)}
                    r={10}
                    fill="white"
                    stroke="var(--primary)"
                    strokeWidth="1"
                    opacity={0.7}
                  />
                  <text
                    x={node.positionX + (node.parentId ? 30 : 40)}
                    y={node.positionY - (node.parentId ? 25 : 35)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="var(--primary)"
                    fontSize="14"
                    fontWeight="bold"
                    className="pointer-events-none select-none"
                  >
                    +
                  </text>
                </g>
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Inline input for creating child node */}
      {creatingFor && creatingFor !== "root" && (
        <div className="absolute bottom-2 left-2 right-2 z-10">
          <MindMapNodeInput
            onSubmit={(label) => handleCreateNode(label, creatingFor)}
            onCancel={() => setCreatingFor(null)}
          />
        </div>
      )}

      {/* Delete button for selected node */}
      {selectedNode && !creatingFor && (
        <button
          onClick={() => handleDeleteNode(selectedNode)}
          className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      )}
    </div>
  );
}
