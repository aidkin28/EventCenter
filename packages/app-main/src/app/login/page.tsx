"use client";

import dynamic from "next/dynamic";
import { LoginForm } from "@/src/components/auth/login-form";

const IsometricEventCenter = dynamic(
  () => import("@/src/components/isometric/IsometricEventCenter"),
  { ssr: false }
);

const ScotiabankHexLogo = dynamic(
  () => import("@/src/components/ScotiabankHexLogo").then((m) => ({ default: m.ScotiabankHexLogo })),
  { ssr: false, loading: () => <div className="w-40 h-40" /> }
);

export default function Page() {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden">
      {/* z-0: Animated isometric background */}
      <div className="absolute inset-0 z-0">
        <IsometricEventCenter showStage showRegistration bannerText="Convene" enableInteractions />
      </div>

      {/* z-1: Subtle white gradient overlay for readability */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-white/30 via-white/10 to-white/30 pointer-events-none" />

      {/* z-10: Glass card with login form */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-6 p-6 md:p-10">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full flex flex-col items-center gap-6 border border-white/40">
          <div className="w-40 h-40 overflow-visible">
            <ScotiabankHexLogo loading={true} />
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
