"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@common/components/ui/Tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventsTab } from "@/components/admin/EventsTab";
import { SessionsTab } from "@/components/admin/SessionsTab";
import { SpeakersTab } from "@/components/admin/SpeakersTab";
import { AttendeesTab } from "@/components/admin/AttendeesTab";
import { UsersTab } from "@/components/admin/UsersTab";

export default function AdminPage() {
  return (
    <div>
      <PageHeader title="Admin" subtitle="Manage events, sessions, speakers, attendees, and users" />

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="speakers">Speakers</TabsTrigger>
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <EventsTab />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="speakers">
          <SpeakersTab />
        </TabsContent>
        <TabsContent value="attendees">
          <AttendeesTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
