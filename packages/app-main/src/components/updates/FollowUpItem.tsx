"use client";

import { useState } from "react";
import { Badge } from "@/src/components/ui/badge";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/src/components/ui/alert-dialog";
import {
  IconFlask,
  IconPresentation,
  IconUsers,
  IconMicrophone2,
  IconHeart,
  IconChecklist,
  IconBook,
  IconNetwork,
  IconExternalLink,
  IconInfoCircle,
  IconLoader2,
} from "@tabler/icons-react";
import { cn } from "@/src/lib/utils";

export interface FollowUp {
  id: string;
  title: string;
  summary: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  chatSession: {
    id: string;
    sessionId: string;
    periodDate: string;
  };
  extractedActivity: {
    id: string;
    activityType: string;
    summary: string;
    quantity: number;
  };
}

interface FollowUpItemProps {
  followUp: FollowUp;
  onMarkComplete: (id: string) => Promise<void>;
}

const activityConfig: Record<
  string,
  { label: string; icon: typeof IconFlask; color: string }
> = {
  experiments: {
    label: "Experiment",
    icon: IconFlask,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  product_demos: {
    label: "Demo",
    icon: IconPresentation,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  mentoring: {
    label: "Mentoring",
    icon: IconUsers,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  presentations: {
    label: "Presentation",
    icon: IconMicrophone2,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  },
  volunteering: {
    label: "Volunteering",
    icon: IconHeart,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  },
  general_task: {
    label: "Task",
    icon: IconChecklist,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  },
  research_learning: {
    label: "Learning",
    icon: IconBook,
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  },
  networking: {
    label: "Networking",
    icon: IconNetwork,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  },
};

export function FollowUpItem({ followUp, onMarkComplete }: FollowUpItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const config = activityConfig[followUp.extractedActivity.activityType];
  const Icon = config?.icon || IconChecklist;

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await onMarkComplete(followUp.id);
    } finally {
      setIsCompleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const sessionDate = formatDate(followUp.chatSession.periodDate);

  return (
    <div className="group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50">
      {/* Checkbox with confirmation dialog */}
      <div className="pt-0.5">
        {isCompleting ? (
          <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Checkbox
                checked={false}
                disabled={isCompleting}
                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 cursor-pointer"
              />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Complete Follow-up?</AlertDialogTitle>
                <AlertDialogDescription>
                  Mark &ldquo;{followUp.title}&rdquo; as completed. This action
                  can be undone from the follow-ups page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleComplete}>
                  Complete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate flex-1">
            {followUp.title}
          </span>

          {/* Info tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
              >
                <IconInfoCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">{followUp.summary}</p>
              <p className="text-xs text-slate-300 mt-1">
                Activity: {followUp.extractedActivity.summary}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* External link to session */}
          <a
            href={`/update/history?session=${followUp.chatSession.sessionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
            title="View original session"
          >
            <IconExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1.5">
          {config && (
            <Badge
              variant="secondary"
              className={cn("text-xs py-0 px-1.5 gap-1", config.color)}
            >
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {sessionDate}
          </span>
          {followUp.dueDate && (
            <span className="text-xs text-muted-foreground">
              Due: {formatDate(followUp.dueDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
