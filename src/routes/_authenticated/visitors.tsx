import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { UserPlus, Search, Pencil, Trash2, Phone, MapPin, QrCode } from "lucide-react";
import { VisitorQRCode } from "@/modules/visitors/ui/visitor-qr-code";
import {
  listVisitors,
  createVisitor,
  updateVisitor,
  deleteVisitor,
} from "@/modules/visitors/visitors.functions";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/visitors")({
  head: () => ({
    meta: [
      { title: "Visitors — Shekinah Glory Baptist Church" },
      { name: "description", content: "Track church visitors, invitations and follow-up visits." },
    ],
  }),
  component: VisitorsPage,
});

type VisitorRow = {
  id: string;
  church_id: string;
  visit_date: string;
  full_name: string;
  age: number | null;
  address: string | null;
  contact_number: string | null;
  source: "invited" | "walk_in";
  invited_by: string | null;
  can_visit: boolean;
  visit_when: string | null;
  notes: string | null;
  churches?: { name: string } | null;
};

type FormState = {
  id?: string;
  visit_date: string;
  full_name: string;
  age: string;
  address: string;
  contact_number: string;
  source: "invited" | "walk_in";
  invited_by: string;
  can_visit: boolean;
  visit_when: string;
  notes: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): FormState => ({
  visit_date: today(),
  full_name: "",
  age: "",
  address: "",
  contact_number: "",
  source: "walk_in",
  invited_by: "",
  can_visit: false,
  visit_when: "",
  notes: "",
});

function VisitorsPage() {
  const { currentChurchId, currentChurch, churches } = useCurrentChurch();
  const qc = useQueryClient();

  const listFn = useServerFn(listVisitors);
  const createFn = useServerFn(createVisitor);
  const updateFn = useServerFn(updateVisitor);
  const deleteFn = useServerFn(deleteVisitor);

  const [q, setQ] = useState("");
  const [source, setSource] = useState<"all" | "invited" | "walk_in">("all");
  const [open, setOpen] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const key = ["visitors", currentChurchId, q, source] as const;
  const { data: rows, isLoading } = useQuery({
    queryKey: key,
    queryFn: () =>
      listFn({
        data: {
          church_id: currentChurchId,
          q,
          source: source === "all" ? null : source,
        },
      }) as Promise<VisitorRow[]>,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["visitors"] });

  const createM = useMutation({
    mutationFn: (payload: any) => createFn({ data: payload }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success("Visitor added");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save visitor"),
  });
  const updateM = useMutation({
    mutationFn: (payload: any) => updateFn({ data: payload }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success("Visitor updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update visitor"),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Visitor deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete visitor"),
  });

  const targetChurchId = useMemo(
    () => currentChurchId ?? (churches.length === 1 ? churches[0].id : null),
    [currentChurchId, churches],
  );

  const openCreate = () => {
    setForm(emptyForm());
    setOpen(true);
  };
  const openEdit = (r: VisitorRow) => {
    setForm({
      id: r.id,
      visit_date: r.visit_date,
      full_name: r.full_name,
      age: r.age == null ? "" : String(r.age),
      address: r.address ?? "",
      contact_number: r.contact_number ?? "",
      source: r.source,
      invited_by: r.invited_by ?? "",
      can_visit: r.can_visit,
      visit_when: r.visit_when ?? "",
      notes: r.notes ?? "",
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.full_name.trim()) return toast.error("Name is required");
    const church_id = form.id
      ? (rows?.find((r) => r.id === form.id)?.church_id ?? targetChurchId)
      : targetChurchId;
    if (!church_id) return toast.error("Select a church first");
    const payload = {
      church_id,
      visit_date: form.visit_date || today(),
      full_name: form.full_name.trim(),
      age: form.age === "" ? null : Number(form.age),
      address: form.address || null,
      contact_number: form.contact_number || null,
      source: form.source,
      invited_by: form.source === "invited" ? form.invited_by || null : null,
      can_visit: form.can_visit,
      visit_when: form.can_visit && form.visit_when ? form.visit_when : null,
      notes: form.notes || null,
    };
    if (form.id) updateM.mutate({ id: form.id, ...payload });
    else createM.mutate(payload);
  };

  const scopeLabel = currentChurchId
    ? (currentChurch?.name ?? "Church")
    : `All Churches (${churches.length})`;
  const disableCreate = !targetChurchId;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Visitors"
        description={`Guest tracking & follow-up — ${scopeLabel}`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate} disabled={disableCreate}>
                <UserPlus className="h-4 w-4 mr-1.5" /> Add visitor
              </Button>
            </DialogTrigger>
            <VisitorFormDialog
              form={form}
              setForm={setForm}
              onSubmit={submit}
              saving={createM.isPending || updateM.isPending}
              editing={!!form.id}
            />
          </Dialog>
        }
      />

      {/* QR Code Section */}
      {targetChurchId && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Visitor Registration</h3>
            </div>
            <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-200 text-gray-900 hover:bg-gray-50"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Show QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Visitor Registration QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex justify-center py-4">
                  {targetChurchId && (
                    <VisitorQRCode
                      churchId={targetChurchId}
                      churchName={currentChurch?.name || "Church"}
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="p-4 border border-gray-200 bg-gradient-to-br from-gray-50 to-white shadow-sm">
            <p className="text-sm text-gray-600 mb-3">
              Visitors can scan this QR code to register themselves using a simple form. Share this
              QR code at the entrance or on your bulletin.
            </p>
            {targetChurchId && (
              <VisitorQRCode
                churchId={targetChurchId}
                churchName={currentChurch?.name || "Church"}
              />
            )}
          </Card>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, address or contact"
            className="pl-8 h-9"
          />
        </div>
        <Select value={source} onValueChange={(v) => setSource(v as any)}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
            <SelectItem value="walk_in">Walk-in</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-muted/40 text-muted-foreground text-[11px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Date</th>
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">Age</th>
              <th className="text-left px-3 py-2 font-medium">Contact</th>
              <th className="text-left px-3 py-2 font-medium">Source</th>
              <th className="text-left px-3 py-2 font-medium">Visit?</th>
              {!currentChurchId && <th className="text-left px-3 py-2 font-medium">Church</th>}
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : !rows?.length ? (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                  No visitors yet. Click{" "}
                  <span className="text-foreground font-medium">Add visitor</span> to record the
                  first one.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2 tabular-nums">
                    {format(new Date(r.visit_date), "MMM d, yyyy")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.full_name}</div>
                    {r.address && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {r.address}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{r.age ?? "—"}</td>
                  <td className="px-3 py-2">
                    {r.contact_number ? (
                      <div className="inline-flex items-center gap-1 text-[12px]">
                        <Phone className="h-3 w-3 text-muted-foreground" /> {r.contact_number}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border ${r.source === "invited" ? "border-foreground/20 bg-foreground/5" : "border-border text-muted-foreground"}`}
                    >
                      {r.source === "invited" ? "Invited" : "Walk-in"}
                    </span>
                    {r.source === "invited" && r.invited_by && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        by {r.invited_by}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.can_visit ? (
                      <div>
                        <div className="text-foreground">Yes</div>
                        {r.visit_when && (
                          <div className="text-[11px] text-muted-foreground">
                            {format(new Date(r.visit_when), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </td>
                  {!currentChurchId && (
                    <td className="px-3 py-2 text-muted-foreground">{r.churches?.name ?? "—"}</td>
                  )}
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(r)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete visitor?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove {r.full_name} from visitors.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteM.mutate(r.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {disableCreate && (
        <p className="mt-3 text-[12px] text-muted-foreground">
          Select a specific church from the switcher to add a visitor.
        </p>
      )}
    </div>
  );
}

function VisitorFormDialog({
  form,
  setForm,
  onSubmit,
  saving,
  editing,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  onSubmit: () => void;
  saving: boolean;
  editing: boolean;
}) {
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm({ ...form, [k]: v });
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit visitor" : "Add visitor"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="visit_date">Date</Label>
          <Input
            id="visit_date"
            type="date"
            value={form.visit_date}
            onChange={(e) => set("visit_date", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Name</Label>
          <Input
            id="full_name"
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Juan Dela Cruz"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            min={0}
            max={150}
            value={form.age}
            onChange={(e) => set("age", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact_number">Contact number</Label>
          <Input
            id="contact_number"
            value={form.contact_number}
            onChange={(e) => set("contact_number", e.target.value)}
            placeholder="+63 917 000 0000"
          />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            rows={2}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </div>

        <div className="space-y-1.5 col-span-2">
          <Label>How did they visit?</Label>
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.source === "invited"}
                onCheckedChange={(v) => set("source", v ? "invited" : "walk_in")}
              />
              Invited
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.source === "walk_in"}
                onCheckedChange={(v) => set("source", v ? "walk_in" : "invited")}
              />
              Walk-in
            </label>
          </div>
        </div>

        {form.source === "invited" && (
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="invited_by">Who invited you?</Label>
            <Input
              id="invited_by"
              value={form.invited_by}
              onChange={(e) => set("invited_by", e.target.value)}
              placeholder="Member name"
            />
          </div>
        )}

        <div className="space-y-1.5 col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.can_visit} onCheckedChange={(v) => set("can_visit", !!v)} />
            Can we visit you?
          </label>
        </div>

        {form.can_visit && (
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="visit_when">When?</Label>
            <Input
              id="visit_when"
              type="date"
              value={form.visit_when}
              onChange={(e) => set("visit_when", e.target.value)}
            />
          </div>
        )}

        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Prayer requests, follow-up notes…"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onSubmit} disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : "Add visitor"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
