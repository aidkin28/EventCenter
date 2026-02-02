"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Button } from "@common/components/ui/Button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { CreateTeamDialog } from "@/components/admin/teams/CreateTeamDialog";
import { IconUsers, IconChevronRight, IconShield } from "@tabler/icons-react";

interface Team {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    members: number;
    invitations: number;
  };
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTeams = async () => {
    try {
      const response = await fetch("/api/admin/teams");
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams);
      }
    } catch (error) {
      console.error("Failed to load teams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <IconShield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Team Management</h1>
            <p className="text-muted-foreground">
              Create and manage teams, add members, view statistics
            </p>
          </div>
        </div>
        <CreateTeamDialog onTeamCreated={loadTeams} />
      </div>

      {/* Teams Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <IconUsers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first team to start organizing members.
            </p>
            <CreateTeamDialog onTeamCreated={loadTeams} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/admin/teams/${team.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{team.name}</span>
                    <IconChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardTitle>
                  {team.description && (
                    <CardDescription className="line-clamp-2">
                      {team.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <IconUsers className="h-4 w-4" />
                      {team._count.members} members
                    </div>
                    {team._count.invitations > 0 && (
                      <div className="text-amber-600">
                        {team._count.invitations} pending
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Created by {team.createdBy.name}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
