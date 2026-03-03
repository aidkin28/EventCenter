import { requireAuthGuard } from "@/lib/auth-guard";
import { AppShell } from "@/components/layout/AppShell";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuthGuard();

  return <AppShell>{children}</AppShell>;
}
