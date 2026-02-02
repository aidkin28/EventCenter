"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@common/components/ui/Button";
import { Badge } from "@/src/components/ui/badge";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Textarea } from "@/src/components/ui/textarea";
import {
  IconPlus,
  IconLoader2,
  IconNotes,
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconTrash,
} from "@tabler/icons-react";
import { cn } from "@/src/lib/utils";

interface Todo {
  id: string;
  content: string;
  status: string;
  completedAt: string | null;
  createdAt: string;
}

interface UserTodosSidebarProps {
  className?: string;
}

export function UserTodosSidebar({ className }: UserTodosSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingTodos, setPendingTodos] = useState<Todo[]>([]);
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTodoContent, setNewTodoContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchTodos = useCallback(async () => {
    try {
      const response = await fetch("/api/updates/todos?status=pending");
      if (!response.ok) throw new Error("Failed to fetch todos");
      const data = await response.json();
      setPendingTodos(data.todos || []);
    } catch (err) {
      console.error("Error fetching todos:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCompletedTodos = useCallback(async () => {
    setLoadingCompleted(true);
    try {
      const response = await fetch("/api/updates/todos?status=completed");
      if (!response.ok) throw new Error("Failed to fetch completed todos");
      const data = await response.json();
      setCompletedTodos(data.todos || []);
    } catch (err) {
      console.error("Error fetching completed todos:", err);
    } finally {
      setLoadingCompleted(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAddTodo = async () => {
    if (!newTodoContent.trim() || isAdding) return;

    setIsAdding(true);
    try {
      const response = await fetch("/api/updates/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newTodoContent.trim() }),
      });

      if (!response.ok) throw new Error("Failed to add todo");

      const data = await response.json();
      setPendingTodos((prev) => [data.todo, ...prev]);
      setNewTodoContent("");
      textareaRef.current?.focus();
    } catch (err) {
      console.error("Error adding todo:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCompleteTodo = async (todoId: string) => {
    setCompletingIds((prev) => new Set(prev).add(todoId));
    try {
      const response = await fetch("/api/updates/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoId, status: "completed" }),
      });

      if (!response.ok) throw new Error("Failed to complete todo");

      const data = await response.json();

      // Remove from pending
      setPendingTodos((prev) => prev.filter((t) => t.id !== todoId));

      // Add to completed if viewing
      if (showCompleted) {
        setCompletedTodos((prev) => [data.todo, ...prev]);
      }
    } catch (err) {
      console.error("Error completing todo:", err);
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(todoId);
        return next;
      });
    }
  };

  const handleUncompleteTodo = async (todoId: string) => {
    setCompletingIds((prev) => new Set(prev).add(todoId));
    try {
      const response = await fetch("/api/updates/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoId, status: "pending" }),
      });

      if (!response.ok) throw new Error("Failed to uncomplete todo");

      const data = await response.json();

      // Remove from completed
      setCompletedTodos((prev) => prev.filter((t) => t.id !== todoId));

      // Add to pending
      setPendingTodos((prev) => [data.todo, ...prev]);
    } catch (err) {
      console.error("Error uncompleting todo:", err);
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(todoId);
        return next;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddTodo();
    }
  };

  const toggleShowCompleted = () => {
    if (!showCompleted && completedTodos.length === 0) {
      fetchCompletedTodos();
    }
    setShowCompleted((prev) => !prev);
  };

  const formatCompletedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader
        className="pb-3 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <IconNotes className="h-4 w-4 text-primary" />
            Notes & Todos
          </span>
          <div className="flex items-center gap-2">
            {pendingTodos.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingTodos.length}
              </Badge>
            )}
            {isExpanded ? (
              <IconChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <IconChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardTitle>
      </CardHeader>
      {isExpanded && (
      <CardContent className="space-y-3">
        {/* Add todo input */}
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={newTodoContent}
            onChange={(e) => setNewTodoContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a note or todo..."
            className="min-h-[60px] resize-none text-sm"
            disabled={isAdding}
          />
          <Button
            size="sm"
            onClick={handleAddTodo}
            disabled={!newTodoContent.trim() || isAdding}
            className="w-full gap-2"
          >
            {isAdding ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconPlus className="h-4 w-4" />
            )}
            Add
          </Button>
        </div>

        {/* Pending todos list */}
        {pendingTodos.length > 0 && (
          <div className="space-y-2">
            {pendingTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-start gap-2 rounded-lg border bg-card p-2 text-sm group"
              >
                <div className="pt-0.5">
                  {completingIds.has(todo.id) ? (
                    <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => handleCompleteTodo(todo.id)}
                      className="data-[state=checked]:bg-green-600"
                    />
                  )}
                </div>
                <p className="flex-1 break-words whitespace-pre-wrap">
                  {todo.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {pendingTodos.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No pending todos
          </p>
        )}

        {/* Show completed toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleShowCompleted}
          className="w-full gap-2 text-muted-foreground"
        >
          {showCompleted ? (
            <IconChevronUp className="h-4 w-4" />
          ) : (
            <IconChevronDown className="h-4 w-4" />
          )}
          {showCompleted ? "Hide" : "View"} Completed
        </Button>

        {/* Completed todos list */}
        {showCompleted && (
          <div className="space-y-2">
            {loadingCompleted ? (
              <div className="flex items-center justify-center py-4">
                <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : completedTodos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                No completed todos
              </p>
            ) : (
              completedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-start gap-2 rounded-lg border bg-muted/50 p-2 text-sm group"
                >
                  <div className="pt-0.5">
                    {completingIds.has(todo.id) ? (
                      <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => handleUncompleteTodo(todo.id)}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="break-words whitespace-pre-wrap line-through text-muted-foreground">
                      {todo.content}
                    </p>
                    {todo.completedAt && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <IconCheck className="h-3 w-3" />
                        {formatCompletedDate(todo.completedAt)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
      )}
    </Card>
  );
}
