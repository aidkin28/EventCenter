"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { toast } from "sonner";
import { AuthBackground } from "@/components/auth/auth-background";

export default function VerifyEmailPage() {
  const [isResending, setIsResending] = useState(false);
  const { data: session } = authClient.useSession();

  const handleResend = async () => {
    if (!session?.user?.email) return;

    setIsResending(true);
    const { error } = await authClient.sendVerificationEmail({
      email: session.user.email,
      callbackURL: "/agenda",
    });

    setIsResending(false);

    if (error) {
      toast.error(error.message || "Failed to resend verification email");
    } else {
      toast.success("Verification email resent!");
    }
  };

  return (
    <AuthBackground>
      <div className="w-full max-w-md p-6 md:p-10">
        <Card className="bg-white/70 backdrop-blur-xs border-white/40 shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Mail className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Verify your email</CardTitle>
            <CardDescription>
              You're almost there! We sent a verification link to{" "}
              <span className="font-semibold text-foreground">
                {session?.user?.email || "your email"}
              </span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Check your inbox (and spam folder) for a link to verify your account.
              You must verify your email before accessing the app.
            </p>

            <div className="space-y-2 mt-2">
              <Button
                className="w-full"
                onClick={handleResend}
                disabled={isResending}
              >
                {isResending ? "Sending..." : "Resend Verification Email"}
              </Button>

              <Button variant="ghost" className="w-full" asChild>
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthBackground>
  );
}
