"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  IconFlask,
  IconPresentation,
  IconUsers,
  IconMicrophone,
  IconHeart,
  IconListCheck,
  IconBook,
  IconNetwork,
  IconMessageCircle,
  IconCalendar,
  IconClock,
} from "@tabler/icons-react";
import { format, formatDistanceStrict, parseISO } from "date-fns";

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface ExtractedActivity {
  id: string;
  activityType: string;
  quantity: number;
  summary: string;
  activityDate: string;
}

export interface ChatSessionData {
  id: string;
  sessionId: string;
  updatePeriod: string;
  periodDate: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  messages: ChatMessage[];
  extractedActivities: ExtractedActivity[];
}

interface ChatSessionAccordionProps {
  sessions: ChatSessionData[];
  className?: string;
}

const activityConfig: Record<
  string,
  { icon: typeof IconFlask; label: string; color: string }
> = {
  experiments: {
    icon: IconFlask,
    label: "Experiments",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  product_demos: {
    icon: IconPresentation,
    label: "Demos",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  mentoring: {
    icon: IconUsers,
    label: "Mentoring",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  presentations: {
    icon: IconMicrophone,
    label: "Presentations",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  },
  volunteering: {
    icon: IconHeart,
    label: "Volunteering",
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  },
  general_task: {
    icon: IconListCheck,
    label: "Tasks",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  research_learning: {
    icon: IconBook,
    label: "Learning",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  },
  networking: {
    icon: IconNetwork,
    label: "Networking",
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  },
};

function getActivityBadges(activities: ExtractedActivity[]) {
  const counts = activities.reduce(
    (acc, activity) => {
      acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(counts).map(([type, count]) => {
    const config = activityConfig[type] || activityConfig.general_task;
    const Icon = config.icon;
    return (
      <Badge
        key={type}
        variant="secondary"
        className={cn("gap-1", config.color)}
      >
        <Icon className="h-3 w-3" />
        {count} {config.label}
      </Badge>
    );
  });
}

function formatDuration(startedAt: string, endedAt: string | null) {
  if (!endedAt) return "In progress";
  return formatDistanceStrict(parseISO(endedAt), parseISO(startedAt));
}

function formatPeriod(period: string) {
  const labels: Record<string, string> = {
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    full_day: "Full Day",
  };
  return labels[period] || period;
}

export function ChatSessionAccordion({
  sessions,
  className,
}: ChatSessionAccordionProps) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <Accordion type="single" collapsible className={cn("w-full", className)}>
      {sessions.map((session) => (
        <AccordionItem
          key={session.id}
          value={session.id}
          className="border rounded-lg mb-3 px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex flex-col items-start gap-2 text-left flex-1 mr-4">
              {/* Date and Period */}
              <div className="flex items-center gap-2 text-sm">
                <IconCalendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(parseISO(session.periodDate), "EEEE, MMMM d, yyyy")}
                </span>
                <Badge variant="outline" className="text-xs">
                  {formatPeriod(session.updatePeriod)}
                </Badge>
              </div>

              {/* Meta info row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Duration */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <IconClock className="h-3 w-3" />
                  {formatDuration(session.startedAt, session.endedAt)}
                </div>

                {/* Message count */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <IconMessageCircle className="h-3 w-3" />
                  {session.messages.length} messages
                </div>

                {/* Activity badges */}
                {session.extractedActivities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {getActivityBadges(session.extractedActivities)}
                  </div>
                )}
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <div className="space-y-6 pt-2">
              {/* Conversation Section */}
              <div>
                <h4 className="text-sm font-medium mb-3">Conversation</h4>
                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                  {session.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <span className="block text-[10px] opacity-70 mt-1">
                          {format(parseISO(message.createdAt), "h:mm a")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extracted Activities Section */}
              {session.extractedActivities.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    Extracted Activities
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {session.extractedActivities.map((activity) => {
                      const config =
                        activityConfig[activity.activityType] ||
                        activityConfig.general_task;
                      const Icon = config.icon;

                      return (
                        <div
                          key={activity.id}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="secondary"
                              className={cn("gap-1", config.color)}
                            >
                              <Icon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                            <span className="text-sm font-medium">
                              x{activity.quantity}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {activity.summary}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              parseISO(activity.activityDate),
                              "MMM d, yyyy"
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
