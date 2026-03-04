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

interface Speaker {
  id: string;
  name: string;
  title: string;
  company: string | null;
  bio: string;
  imageUrl: string | null;
  initials: string;
}

const emptyForm = {
  name: "",
  title: "",
  company: "",
  bio: "",
  imageUrl: "",
  initials: "",
};

export function SpeakersTab() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Speaker | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchSpeakers = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/speakers");
    if (res.ok) setSpeakers(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchSpeakers(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (sp: Speaker) => {
    setEditing(sp);
    setForm({
      name: sp.name,
      title: sp.title,
      company: sp.company ?? "",
      bio: sp.bio,
      imageUrl: sp.imageUrl ?? "",
      initials: sp.initials,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const url = editing ? `/api/admin/speakers/${editing.id}` : "/api/admin/speakers";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setDialogOpen(false);
      fetchSpeakers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this speaker?")) return;
    const res = await fetch(`/api/admin/speakers/${id}`, { method: "DELETE" });
    if (res.ok) fetchSpeakers();
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Add Speaker
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : speakers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No speakers yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Initials</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {speakers.map((sp) => (
              <TableRow key={sp.id}>
                <TableCell className="font-medium">{sp.name}</TableCell>
                <TableCell>{sp.title}</TableCell>
                <TableCell>{sp.company || "—"}</TableCell>
                <TableCell>{sp.initials}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(sp)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(sp.id)}>
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
            <DialogTitle>{editing ? "Edit Speaker" : "Create Speaker"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update speaker details." : "Fill in the speaker details."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sp-name">Name</Label>
                <Input id="sp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sp-initials">Initials</Label>
                <Input id="sp-initials" value={form.initials} onChange={(e) => setForm({ ...form, initials: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sp-title">Title</Label>
                <Input id="sp-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sp-company">Company</Label>
                <Input id="sp-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sp-bio">Bio</Label>
              <textarea
                id="sp-bio"
                className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sp-image">Image URL</Label>
              <Input id="sp-image" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
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
