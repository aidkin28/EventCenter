"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { cn } from "@/src/lib/utils";

interface MonthlyStats {
  month: number;
  experiments: number;
  product_demos: number;
  mentoring: number;
  presentations: number;
  volunteering: number;
  total: number;
}

interface MemberStats {
  userId: string;
  userName: string;
  monthlyStats: MonthlyStats[];
  yearlyTotal: {
    experiments: number;
    product_demos: number;
    mentoring: number;
    presentations: number;
    volunteering: number;
    total: number;
  };
}

interface TeamStatsTableProps {
  members: MemberStats[];
  teamTotals: {
    experiments: number;
    product_demos: number;
    mentoring: number;
    presentations: number;
    volunteering: number;
    total: number;
  };
  monthlyTeamTotals: MonthlyStats[];
  className?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function TeamStatsTable({
  members,
  teamTotals,
  monthlyTeamTotals,
  className,
}: TeamStatsTableProps) {
  const formatNumber = (num: number) => {
    if (num === 0) return "-";
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
  };

  return (
    <div className={cn("rounded-lg border overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[200px]">
              Member
            </TableHead>
            {MONTHS.map((month) => (
              <TableHead key={month} className="text-center min-w-[70px]">
                {month}
              </TableHead>
            ))}
            <TableHead className="text-center min-w-[90px] bg-muted/80 font-semibold">
              Year Total
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.userId}>
              <TableCell className="sticky left-0 bg-background z-10 font-medium">
                {member.userName}
              </TableCell>
              {member.monthlyStats.map((stats, monthIndex) => (
                <TableCell
                  key={monthIndex}
                  className={cn(
                    "text-center tabular-nums",
                    stats.total === 0
                      ? "text-muted-foreground/40"
                      : stats.total >= 5
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : ""
                  )}
                >
                  {formatNumber(stats.total)}
                </TableCell>
              ))}
              <TableCell
                className={cn(
                  "text-center tabular-nums font-semibold bg-muted/30",
                  member.yearlyTotal.total > 0 && "text-primary"
                )}
              >
                {formatNumber(member.yearlyTotal.total)}
              </TableCell>
            </TableRow>
          ))}

          {/* Team totals row */}
          <TableRow className="border-t-2 bg-muted/30 font-semibold">
            <TableCell className="sticky left-0 bg-muted/30 z-10">
              Team Total
            </TableCell>
            {monthlyTeamTotals.map((stats, monthIndex) => (
              <TableCell
                key={monthIndex}
                className={cn(
                  "text-center tabular-nums",
                  stats.total > 0 && "text-primary"
                )}
              >
                {formatNumber(stats.total)}
              </TableCell>
            ))}
            <TableCell className="text-center tabular-nums text-primary bg-primary/10">
              {formatNumber(teamTotals.total)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
