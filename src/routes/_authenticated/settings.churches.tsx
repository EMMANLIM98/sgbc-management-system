import { createFileRoute } from "@tanstack/react-router";
import { useMyContext } from "@/hooks/use-my-context";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import { createChurch, updateChurch } from "@/modules/tenancy/tenancy.functions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/churches")({
  component: ChurchesSettings,
});

function ChurchesSettings() {
  const { data } = useMyContext();
  const qc = useQueryClient();
  const createFn = useServerFn(createChurch);
  const updateFn = useServerFn(updateChurch);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("");

  const org = data?.organizations[0];

  const createM = useMutation({
    mutationFn: () => createFn({ data: { organization_id: org!.id, name, slug: slug || slugify(name), city, currency: "PHP" } }),
    onSuccess: () => { toast.success("Church created"); setOpen(false); setName(""); setSlug(""); setCity(""); qc.invalidateQueries({ queryKey: ["me-context"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!data) return null;
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-medium">Churches</h2>
          <p className="text-[12px] text-muted-foreground">{data.churches.length} in your organization.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New church</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New church</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-[12px]">Name</Label><Input value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} /></div>
              <div className="space-y-1.5"><Label className="text-[12px]">Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-[12px]">City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={!name || createM.isPending} onClick={() => createM.mutate()}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-border rounded-lg bg-card divide-y divide-border">
        {data.churches.map((c) => (
          <ChurchRow key={c.id} church={c} onSaved={() => qc.invalidateQueries({ queryKey: ["me-context"] })} updateFn={updateFn} />
        ))}
        {data.churches.length === 0 && (
          <div className="p-8 text-center text-[13px] text-muted-foreground">
            <Building2 className="h-5 w-5 mx-auto mb-2 opacity-60" /> No churches yet.
          </div>
        )}
      </div>
    </div>
  );
}

function ChurchRow({ church, onSaved, updateFn }: { church: any; onSaved: () => void; updateFn: any }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(church.name);
  const [city, setCity] = useState(church.city ?? "");
  const mut = useMutation({
    mutationFn: () => updateFn({ data: { id: church.id, name, city } }),
    onSuccess: () => { toast.success("Saved"); onSaved(); setEditing(false); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="p-3 flex items-center gap-3">
      <div className="h-8 w-8 rounded-md bg-accent grid place-items-center"><Building2 className="h-4 w-4 text-muted-foreground" /></div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-[13px]" />
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-8 text-[13px]" placeholder="City" />
          </div>
        ) : (
          <>
            <div className="text-[13px] font-medium truncate">{church.name}</div>
            <div className="text-[11px] text-muted-foreground">{church.city || "—"} · {church.slug}</div>
          </>
        )}
      </div>
      {editing ? (
        <>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>Save</Button>
        </>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
      )}
    </div>
  );
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}
