"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@common/components/ui/Table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@common/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Attendee {
  id: string;
  name: string;
  title: string | null;
  imageUrl: string | null;
  initials: string | null;
}

const emptyForm = {
  name: "",
  title: "",
  imageUrl: "",
  initials: "",
};

export function AttendeesTab() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Attendee | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAttendees = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/attendees");
    if (res.ok) setAttendees(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchAttendees(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (a: Attendee) => {
    setEditing(a);
    setForm({
      name: a.name,
      title: a.title ?? "",
      imageUrl: a.imageUrl ?? "",
      initials: a.initials ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const url = editing ? `/api/admin/attendees/${editing.id}` : "/api/admin/attendees";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setDialogOpen(false);
      fetchAttendees();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this attendee?")) return;
    const res = await fetch(`/api/admin/attendees/${id}`, { method: "DELETE" });
    if (res.ok) fetchAttendees();
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Add Attendee
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : attendees.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attendees yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Initials</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendees.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell>{a.title || "—"}</TableCell>
                <TableCell>{a.initials || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Attendee" : "Create Attendee"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update attendee details." : "Fill in the attendee details."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="a-name">Name</Label>
                <Input id="a-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="a-initials">Initials</Label>
                <Input id="a-initials" value={form.initials} onChange={(e) => setForm({ ...form, initials: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="a-title">Title</Label>
              <Input id="a-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="a-image">Image URL</Label>
              <Input id="a-image" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
