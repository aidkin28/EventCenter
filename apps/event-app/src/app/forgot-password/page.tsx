"use client";

import { useState } from "react";
import { AuthBackground } from "@/components/auth/auth-background";
import { ScotiabankHexLogo } from "@/components/ScotiabankHexLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft } from "lucide-react";
import { IconLoader } from "@tabler/icons-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    setLoading(false);

    if (error) {
      setError(error.message || "Failed to send reset email");
    } else {
      setSent(true);
    }
  };

  return (
    <AuthBackground>
      <div className="w-full max-w-md flex flex-col items-center gap-6 p-6 md:p-10">
        <div className="bg-white/70 backdrop-blur-xs rounded-2xl shadow-2xl p-8 w-full flex flex-col items-center gap-6 border border-white/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12">
              <ScotiabankHexLogo />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Convene</h1>
          </div>

          {sent ? (
            <Card className="w-full border-0 shadow-none bg-transparent">
              <CardHeader className="text-center px-0">
                <div className="flex justify-center mb-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl">Check your email</CardTitle>
                <CardDescription>
                  We sent a password reset link to{" "}
                  <span className="font-semibold text-foreground">{email}</span>.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 px-0">
                <p className="text-sm text-muted-foreground text-center">
                  Check your inbox (and spam folder) for a link to reset your password.
                </p>
                <Button variant="ghost" className="w-full" asChild>
                  <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full border-0 shadow-none bg-transparent">
              <CardHeader className="px-0">
                <CardTitle>Forgot your password?</CardTitle>
                <CardDescription>
                  Enter your email and we'll send you a link to reset your password.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {error && (
                  <Alert className="mb-4 border border-red-500" variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-3">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button disabled={loading} type="submit" className="w-full">
                      {loading ? (
                        <IconLoader className="animate-spin" stroke={2} />
                      ) : (
                        "Send Reset Link"
                      )}
                    </Button>
                  </div>
                  <div className="mt-4 text-center text-sm">
                    <Link href="/login" className="underline underline-offset-4">
                      Back to Login
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthBackground>
  );
}
