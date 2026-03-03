"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthBackground } from "@/components/auth/auth-background";
import { ScotiabankHexLogo } from "@/components/ScotiabankHexLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { IconLoader } from "@tabler/icons-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token. Please request a new reset link.");
      return;
    }

    setLoading(true);

    const { error } = await authClient.resetPassword({
      newPassword,
      token,
    });

    setLoading(false);

    if (error) {
      setError(error.message || "Failed to reset password. The link may have expired.");
    } else {
      setSuccess(true);
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

          {success ? (
            <Card className="w-full border-0 shadow-none bg-transparent">
              <CardHeader className="text-center px-0">
                <div className="flex justify-center mb-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-xl">Password reset successful</CardTitle>
                <CardDescription>
                  Your password has been updated. You can now log in with your new password.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Button className="w-full" asChild>
                  <Link href="/login">Go to Login</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full border-0 shadow-none bg-transparent">
              <CardHeader className="px-0">
                <CardTitle>Reset your password</CardTitle>
                <CardDescription>
                  Enter your new password below.
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
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                    </div>
                    <Button disabled={loading} type="submit" className="w-full">
                      {loading ? (
                        <IconLoader className="animate-spin" stroke={2} />
                      ) : (
                        "Reset Password"
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
