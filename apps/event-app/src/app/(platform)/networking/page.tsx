"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { NetworkingLayout } from "@/components/networking/NetworkingLayout";
import { CreateGroupDialog } from "@/components/networking/CreateGroupDialog";

export default function NetworkingPage() {
  return (
    <>
      <PageHeader
        title="Networking"
        subtitle="Connect with fellow attendees in topic-based groups"
        action={<CreateGroupDialog />}
      />
      <NetworkingLayout />
    </>
  );
}
