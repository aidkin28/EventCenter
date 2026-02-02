import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authorization";
import { handleApiError } from "@/lib/api-error";

/**
 * GET /api/dashboard/metrics - Get dashboard metrics for the current user
 */
export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    // Calculate date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Fetch all metrics in parallel
    const [
      dbUser,
      pendingFollowUps,
      weeklyActivities,
      monthlyActivities,
      monthlyByType,
      recentUpdates,
      userTeam,
    ] = await Promise.all([
      // Get user streak info
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          streakCurrent: true,
          streakLongest: true,
          totalPoints: true,
        },
      }),

      // Count pending follow-ups
      prisma.updateFollowUp.count({
        where: { userId: user.id, status: "confirmed" },
      }),

      // Count activities this week
      prisma.extractedActivity.count({
        where: {
          userId: user.id,
          activityDate: { gte: startOfWeek },
        },
      }),

      // Count activities this month
      prisma.extractedActivity.count({
        where: {
          userId: user.id,
          activityDate: { gte: startOfMonth },
        },
      }),

      // Group activities by type this month
      prisma.extractedActivity.groupBy({
        by: ["activityType"],
        where: {
          userId: user.id,
          activityDate: { gte: startOfMonth },
        },
        _sum: { quantity: true },
        _count: true,
      }),

      // Get recent daily updates
      prisma.dailyUpdate.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          _count: { select: { extractedActivities: true } },
        },
      }),

      // Get user's active team
      prisma.teamMember.findFirst({
        where: { userId: user.id },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              _count: { select: { members: true } },
            },
          },
        },
      }),
    ]);

    // Get top pending follow-ups with due dates
    const topFollowUps = await prisma.updateFollowUp.findMany({
      where: { userId: user.id, status: "confirmed" },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        dueDate: true,
        extractedActivity: {
          select: { activityType: true },
        },
      },
    });

    // Get team activity this month if user has a team
    let teamMonthlyActivities = 0;
    if (userTeam?.team) {
      teamMonthlyActivities = await prisma.extractedActivity.count({
        where: {
          teamId: userTeam.team.id,
          activityDate: { gte: startOfMonth },
        },
      });
    }

    return NextResponse.json({
      streak: {
        current: dbUser?.streakCurrent || 0,
        longest: dbUser?.streakLongest || 0,
        points: dbUser?.totalPoints || 0,
      },
      pendingFollowUpsCount: pendingFollowUps,
      activitiesThisWeek: weeklyActivities,
      activitiesThisMonth: monthlyActivities,
      activitiesByType: monthlyByType.map((item) => ({
        activityType: item.activityType,
        count: item._count,
        totalQuantity: item._sum.quantity || 0,
      })),
      recentUpdates: recentUpdates.map((update) => ({
        id: update.id,
        periodDate: update.periodDate.toISOString(),
        updatePeriod: update.updatePeriod,
        createdAt: update.createdAt.toISOString(),
        activityCount: update._count.extractedActivities,
      })),
      topFollowUps: topFollowUps.map((fu) => ({
        id: fu.id,
        title: fu.title,
        dueDate: fu.dueDate?.toISOString() || null,
        activityType: fu.extractedActivity.activityType,
      })),
      team: userTeam?.team
        ? {
            id: userTeam.team.id,
            name: userTeam.team.name,
            memberCount: userTeam.team._count.members,
            monthlyActivities: teamMonthlyActivities,
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error, "dashboard/metrics:GET");
  }
}
