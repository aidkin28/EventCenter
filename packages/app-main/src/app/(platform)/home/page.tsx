"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import MoonBase from "@/public/imgs/MoonBase.png";
import { Button } from "@common/components/ui/Button";
import { IconPlus } from "@tabler/icons-react";

export default function Page() {
	const router = useRouter();

	return (
		<>
			{/* MoonBase Hero Banner - Taller with white inner shadow */}
			<div className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
				<Image
					src={MoonBase}
					alt="MoonBase - Your Command Center"
					fill
					className="object-cover"
					priority
				/>
				{/* White inner shadow at bottom */}
				<div className="absolute inset-0 shadow-[inset_0_-80px_60px_-20px_rgba(255,255,255,0.95)]" />
				<div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90" />
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="text-center text-white drop-shadow-lg">
						<h1 className="text-4xl md:text-5xl font-bold mb-2">Command Center</h1>
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
			</div>
		</>
	);
}
