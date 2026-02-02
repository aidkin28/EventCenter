import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, Role } from "@/lib/authorization";
import { handleApiError, apiError, ErrorCode } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface MonthlyStats {
  month: number;
  experiments: number;
  product_demos: number;
  mentoring: number;
  presentations: number;
  volunteering: number;
  general_task: number;
  research_learning: number;
  networking: number;
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
    general_task: number;
    research_learning: number;
    networking: number;
    total: number;
  };
}

const ACTIVITY_TYPES = [
  "experiments",
  "product_demos",
  "mentoring",
  "presentations",
  "volunteering",
  "general_task",
  "research_learning",
  "networking",
] as const;

/**
 * GET /api/admin/teams/[id]/stats - Get team statistics
 */
export async function GET(request: Request, { params }: RouteParams) {
  const authResult = await requireAuth({ permissions: { role: Role.ADMIN } });
  if (!authResult.success) return authResult.response;

  const { id: teamId } = await params;
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

  try {
    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!team) {
      return apiError("Team not found", ErrorCode.NOT_FOUND, 404);
    }

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const memberIds = team.members.map((m) => m.user.id);

    // Get all activities for team members in the year
    const activities = await prisma.extractedActivity.findMany({
      where: {
        userId: { in: memberIds },
        activityDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        userId: true,
        activityType: true,
        quantity: true,
        activityDate: true,
      },
    });

    // Build stats per member
    const memberStatsMap = new Map<string, MemberStats>();

    // Initialize all members with zero stats
    for (const member of team.members) {
      const monthlyStats: MonthlyStats[] = [];
      for (let month = 0; month < 12; month++) {
        monthlyStats.push({
          month: month + 1,
          experiments: 0,
          product_demos: 0,
          mentoring: 0,
          presentations: 0,
          volunteering: 0,
          general_task: 0,
          research_learning: 0,
          networking: 0,
          total: 0,
        });
      }

      memberStatsMap.set(member.user.id, {
        userId: member.user.id,
        userName: member.user.name,
        monthlyStats,
        yearlyTotal: {
          experiments: 0,
          product_demos: 0,
          mentoring: 0,
          presentations: 0,
          volunteering: 0,
          general_task: 0,
          research_learning: 0,
          networking: 0,
          total: 0,
        },
      });
    }

    // Aggregate activities
    for (const activity of activities) {
      const memberStats = memberStatsMap.get(activity.userId);
      if (!memberStats) continue;

      const month = new Date(activity.activityDate).getMonth();
      const monthStats = memberStats.monthlyStats[month];
      const quantity = Number(activity.quantity);

      const activityType = activity.activityType as (typeof ACTIVITY_TYPES)[number];
      if (ACTIVITY_TYPES.includes(activityType)) {
        monthStats[activityType] += quantity;
        monthStats.total += quantity;
        memberStats.yearlyTotal[activityType] += quantity;
        memberStats.yearlyTotal.total += quantity;
      }
    }

    // Calculate team totals
    const teamTotals = {
      experiments: 0,
      product_demos: 0,
      mentoring: 0,
      presentations: 0,
      volunteering: 0,
      general_task: 0,
      research_learning: 0,
      networking: 0,
      total: 0,
    };

    const monthlyTeamTotals: MonthlyStats[] = [];
    for (let month = 0; month < 12; month++) {
      monthlyTeamTotals.push({
        month: month + 1,
        experiments: 0,
        product_demos: 0,
        mentoring: 0,
        presentations: 0,
        volunteering: 0,
        general_task: 0,
        research_learning: 0,
        networking: 0,
        total: 0,
      });
    }

    for (const member of memberStatsMap.values()) {
      for (const type of ACTIVITY_TYPES) {
        teamTotals[type] += member.yearlyTotal[type];
      }
      teamTotals.total += member.yearlyTotal.total;

      for (let month = 0; month < 12; month++) {
        for (const type of ACTIVITY_TYPES) {
          monthlyTeamTotals[month][type] += member.monthlyStats[month][type];
        }
        monthlyTeamTotals[month].total += member.monthlyStats[month].total;
      }
    }

    return NextResponse.json({
      teamId,
      teamName: team.name,
      year,
      members: Array.from(memberStatsMap.values()),
      teamTotals,
      monthlyTeamTotals,
    });
  } catch (error) {
    return handleApiError(error, "admin/teams/[id]/stats:GET");
  }
}
