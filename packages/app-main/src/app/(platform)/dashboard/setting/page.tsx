"use client";

import { useState, useEffect } from "react";
import { ModeToggle } from "@/src/components/mode-toggle";
import { Separator } from "@/src/components/ui/separator";
import { Label } from "@/src/components/ui/label";
import { Input } from "@/src/components/ui/input";
import { Button } from "@common/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@common/components/ui/dialog";
import { Skeleton } from "@/src/components/ui/skeleton";
import { IconUsers, IconPlus, IconLoader2 } from "@tabler/icons-react";
import { toast } from "@common/components/ui/sonner";

interface Team {
  id: string;
  name: string;
  description: string | null;
  role: string;
}

export default function SettingsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Create team dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingTeams(true);
      try {
        // Load user's teams and active team in parallel
        const [teamsRes, activeTeamRes] = await Promise.all([
          fetch("/api/user/teams"),
          fetch("/api/user/active-team"),
        ]);

        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          setTeams(teamsData.teams);
        }

        if (activeTeamRes.ok) {
          const activeData = await activeTeamRes.json();
          setActiveTeamId(activeData.activeTeamId);
        }
      } catch (error) {
        console.error("Failed to load settings data:", error);
      } finally {
        setIsLoadingTeams(false);
      }
    };

    loadData();
  }, []);

  const handleTeamChange = async (value: string) => {
    const newTeamId = value === "none" ? null : value;
    setIsUpdating(true);

    try {
      const response = await fetch("/api/user/active-team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: newTeamId }),
      });

      if (response.ok) {
        setActiveTeamId(newTeamId);
        toast.success(
          newTeamId
            ? "Active team updated"
            : "Active team cleared"
        );
      } else {
        toast.error("Failed to update active team");
      }
    } catch (error) {
      console.error("Failed to update active team:", error);
      toast.error("Failed to update active team");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/user/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDescription.trim() || undefined,
        }),
      });

      if (response.ok) {
        const { team } = await response.json();
        // Add new team to list with owner role
        setTeams([...teams, { ...team, role: "owner" }]);
        // Set as active team
        setActiveTeamId(team.id);
        // Also update the backend active team
        await fetch("/api/user/active-team", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId: team.id }),
        });
        setShowCreateDialog(false);
        setNewTeamName("");
        setNewTeamDescription("");
        toast.success("Team created successfully");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to create team");
      }
    } catch (error) {
      console.error("Failed to create team:", error);
      toast.error("Failed to create team");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="px-4 lg:px-6 space-y-8">
      {/* Appearance Section */}
      <div>
        <h1 className="text-lg font-medium">Appearance</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Choose your preferred appearance settings.
        </p>
        <ModeToggle />
      </div>

      <Separator />

      {/* Team Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <IconUsers className="h-5 w-5" />
            <h2 className="text-lg font-medium">Team</h2>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <IconPlus className="h-4 w-4 mr-1" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Create a team to collaborate with others on tracking activities and goals.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input
                    id="team-name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g., Engineering Team"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-desc">Description (optional)</Label>
                  <Input
                    id="team-desc"
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    placeholder="What is this team for?"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTeam}
                  disabled={isCreating || !newTeamName.trim()}
                >
                  {isCreating ? (
                    <>
                      <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Team"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Set your active team to associate new updates with that team.
        </p>

        {isLoadingTeams ? (
          <div className="space-y-2 max-w-md">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You are not a member of any teams yet. Create a team or ask a team
            administrator to add you.
          </p>
        ) : (
          <div className="space-y-2 max-w-md">
            <Label htmlFor="active-team">Active Team</Label>
            <Select
              value={activeTeamId || "none"}
              onValueChange={handleTeamChange}
              disabled={isUpdating}
            >
              <SelectTrigger id="active-team">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Team</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              New updates and activities will be associated with this team.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
