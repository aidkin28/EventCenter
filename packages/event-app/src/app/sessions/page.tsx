"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionList } from "@/components/sessions/SessionList";
import { AddSessionForm } from "@/components/sessions/AddSessionForm";

export default function SessionsPage() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Sessions"
        subtitle="Browse all sessions and upvote the ones you're excited about"
        action={
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Propose a Session
          </button>
        }
      />

      <SessionList />

      <AddSessionForm open={formOpen} onOpenChange={setFormOpen} />
    </>
  );
}
