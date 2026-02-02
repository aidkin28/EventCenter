"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import MoonBase from "@/public/imgs/MoonBase.png";
import { Button } from "@common/components/ui/Button";
import { GoalCard } from "@/components/goals/GoalCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { IconTarget, IconPlus } from "@tabler/icons-react";

interface Goal {
	id: string;
	title: string;
	description: string;
	status: string;
	targetDate?: string | null;
	councilScore?: number | null;
	councilReviewedAt?: string | null;
	_count?: {
		expertReviews?: number;
		goalUpdates?: number;
	};
}

export default function Page() {
	const [goals, setGoals] = useState<Goal[]>([]);
	const [isLoadingGoals, setIsLoadingGoals] = useState(true);
	const router = useRouter();

	// Fetch user's goals
	useEffect(() => {
		async function fetchGoals() {
			try {
				const response = await fetch("/api/goals?status=active");
				if (response.ok) {
					const data = await response.json();
					setGoals(data.goals || []);
				}
			} catch (error) {
				console.error("Failed to fetch goals:", error);
			} finally {
				setIsLoadingGoals(false);
			}
		}
		fetchGoals();
	}, []);

	const hasGoals = goals.length > 0;

	return (
		<>
			{/* MoonBase Hero Banner */}
			<div className="relative w-full h-[300px] md:h-[400px] overflow-hidden">
				<Image
					src={MoonBase}
					alt="MoonBase - Your Goal Command Center"
					fill
					className="object-cover"
					priority
				/>
				<div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="text-center text-white drop-shadow-lg">
						<h1 className="text-4xl md:text-5xl font-bold mb-2">Goal Command Center</h1>
						<p className="text-lg md:text-xl opacity-90">Your mission control for achievement</p>
					</div>
				</div>
			</div>

			{/* Quick Actions - centered below banner */}
			<div className="flex justify-center gap-4 py-8">
				<Button
					onClick={() => router.push("/update")}
					className="bg-primary text-primary-foreground border border-primary/20 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
					size="lg"
				>
					<IconPlus className="mr-2 h-5 w-5" />
					New Update
				</Button>
				<Button
					onClick={() => router.push("/goals/new")}
					className="bg-primary text-primary-foreground border border-primary/20 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
					size="lg"
				>
					<IconTarget className="mr-2 h-5 w-5" />
					New Goal
				</Button>
			</div>

			{/* Goals Section */}
			<div className="container max-w-6xl pb-8 space-y-8">
				{/* Active Goals */}
				<section>
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<IconTarget className="h-6 w-6 text-primary" />
							<h2 className="text-2xl font-bold">Your Active Goals</h2>
						</div>
					</div>

					{isLoadingGoals ? (
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{[1, 2, 3].map((i) => (
								<Card key={i}>
									<CardContent className="p-6 space-y-4">
										<Skeleton className="h-6 w-3/4" />
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-4 w-2/3" />
									</CardContent>
								</Card>
							))}
						</div>
					) : hasGoals ? (
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{goals.map((goal) => (
								<GoalCard key={goal.id} goal={goal} />
							))}
						</div>
					) : (
						<Card className="border-dashed">
							<CardContent className="py-12 text-center">
								<IconTarget className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
								<h3 className="text-lg font-medium mb-2">No active goals yet</h3>
								<p className="text-muted-foreground mb-4">
									Set your first goal and start tracking your progress.
								</p>
								<Button onClick={() => router.push("/goals/new")}>
									<IconPlus className="mr-2 h-4 w-4" />
									Create Your First Goal
								</Button>
							</CardContent>
						</Card>
					)}
				</section>

				{/* Quick Stats */}
				{hasGoals && (
					<section className="grid gap-4 md:grid-cols-3">
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Active Goals
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold">{goals.length}</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Expert Reviews
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold">
									{goals.reduce((sum, g) => sum + (g._count?.expertReviews || 0), 0)}
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Updates Logged
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold">
									{goals.reduce((sum, g) => sum + (g._count?.goalUpdates || 0), 0)}
								</div>
							</CardContent>
						</Card>
					</section>
				)}
			</div>
		</>
	);
}
