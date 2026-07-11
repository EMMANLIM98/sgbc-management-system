import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { formatPHP } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  listGivingCategories, listMemberPicker,
} from "@/modules/finance/contributions.functions";
import {
  listPledges, createPledge, updatePledge, deletePledge,
} from "@/modules/finance/pledges.functions";
import { ArrowLeft, HandHeart, Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance_/pledges")({
  head: () => ({
    meta: [
      { title: "Pledges — Finance" },
      { name: "description", content: "Manage member giving commitments and pledges." },
    ],
  }),
  component: PledgesPage,
});

const FREQ_LABEL: Record<string, string> = {
  one_time: "One time",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
};

function PledgesPage() {
  const { currentChurchId, currentChurch, churches } = useCurrentChurch();
  const qc = useQueryClient();
  const [status, setStatus] = useState<"all" | "active" | "fulfilled" | "cancelled">("all");
  const [open, setOpen] = useState(false);

  const listFn = useServerFn(listPledges);
  const updateFn = useServerFn(updatePledge);
  const deleteFn = useServerFn(deletePledge);

  const { data: rows } = useQuery({
    queryKey: ["pledges", currentChurchId, status],
    queryFn: () => listFn({ data: { church_id: currentChurchId, status } }),
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: "active" | "fulfilled" | "cancelled" }) =>
      updateFn({ data: { id: v.id, status: v.status } }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["pledges"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["pledges"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const scopeLabel = currentChurchId ? currentChurch?.name ?? "Church" : `All Churches (${churches.length})`;
  const totals = (rows ?? []).reduce(
    (a, r: any) => ({
      pledged: a.pledged + Number(r.amount),
      paid: a.paid + Number(r.paid),
      remaining: a.remaining + Number(r.remaining),
    }),
    { pledged: 0, paid: 0, remaining: 0 },
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-2">
        <Link to="/finance" className="text-[12px] text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Finance
        </Link>
      </div>
      <PageHeader
        title="Pledges"
        description={`Giving commitments — ${scopeLabel}`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New pledge
              </Button>
            </DialogTrigger>
            <PledgeDialog
              onClose={() => setOpen(false)}
              defaultChurchId={currentChurchId ?? churches[0]?.id ?? ""}
              churches={churches}
            />
          </Dialog>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Total pledged" value={formatPHP(totals.pledged)} />
        <Stat label="Fulfilled" value={formatPHP(totals.paid)} />
        <Stat label="Remaining" value={formatPHP(totals.remaining)} />
      </div>

      <div className="border border-border rounded-lg bg-card">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            {(["all", "active", "fulfilled", "cancelled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 h-7 text-[12px] capitalize ${status === s ? "bg-foreground text-background" : "hover:bg-accent"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="text-[12px] text-muted-foreground">{(rows ?? []).length} pledges</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left font-medium px-4 py-2">Member</th>
                <th className="text-left font-medium px-4 py-2">Category / Campaign</th>
                <th className="text-left font-medium px-4 py-2">Frequency</th>
                <th className="text-left font-medium px-4 py-2">Dates</th>
                <th className="text-right font-medium px-4 py-2">Pledged</th>
                <th className="text-right font-medium px-4 py-2">Paid</th>
                <th className="text-left font-medium px-4 py-2 w-[180px]">Progress</th>
                <th className="text-left font-medium px-4 py-2">Status</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r: any) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-2">
                    {r.members ? `${r.members.first_name} ${r.members.last_name}` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: r.finance_categories?.color ?? "currentColor" }} />
                      {r.finance_categories?.name ?? "—"}
                    </div>
                    {r.campaign && <div className="text-[11px] text-muted-foreground">{r.campaign}</div>}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{FREQ_LABEL[r.frequency] ?? r.frequency}</td>
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                    {new Date(r.start_date).toLocaleDateString()}
                    {r.end_date ? ` → ${new Date(r.end_date).toLocaleDateString()}` : ""}
                  </td>
                  <td className="px-4 py-2 text-right tabular font-medium">{formatPHP(Number(r.amount))}</td>
                  <td className="px-4 py-2 text-right tabular">{formatPHP(Number(r.paid))}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-accent rounded-full overflow-hidden">
                        <div className="h-full bg-foreground/70" style={{ width: `${r.progress_pct}%` }} />
                      </div>
                      <span className="text-[11px] tabular text-muted-foreground w-8 text-right">{r.progress_pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-0.5">
                      {r.status !== "fulfilled" && (
                        <button
                          onClick={() => statusMut.mutate({ id: r.id, status: "fulfilled" })}
                          className="p-1 text-muted-foreground hover:text-emerald-600"
                          title="Mark fulfilled"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {r.status !== "cancelled" && (
                        <button
                          onClick={() => statusMut.mutate({ id: r.id, status: "cancelled" })}
                          className="p-1 text-muted-foreground hover:text-amber-600"
                          title="Cancel"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this pledge?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => delMut.mutate(r.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {(rows ?? []).length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-[13px]">
                    No pledges yet. Click <span className="font-medium text-foreground">New pledge</span> to record a commitment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded-lg bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <HandHeart className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
      : status === "fulfilled"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] capitalize ${cls}`}>{status}</span>
  );
}

function PledgeDialog({
  onClose, defaultChurchId, churches,
}: {
  onClose: () => void;
  defaultChurchId: string;
  churches: { id: string; name: string }[];
}) {
  const qc = useQueryClient();
  const [churchId, setChurchId] = useState(defaultChurchId);
  const [memberId, setMemberId] = useState<string>("");
  const [memberQ, setMemberQ] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [campaign, setCampaign] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"one_time" | "weekly" | "monthly" | "quarterly" | "annually">("one_time");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const catsFn = useServerFn(listGivingCategories);
  const membersFn = useServerFn(listMemberPicker);
  const createFn = useServerFn(createPledge);

  const { data: cats } = useQuery({
    queryKey: ["giving-cats", churchId],
    queryFn: () => catsFn({ data: { church_id: churchId } }),
    enabled: !!churchId,
  });
  const { data: members } = useQuery({
    queryKey: ["pledge-members", churchId, memberQ],
    queryFn: () => membersFn({ data: { church_id: churchId, q: memberQ, limit: 30 } }),
    enabled: !!churchId,
  });

  const mut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          church_id: churchId,
          member_id: memberId,
          category_id: categoryId,
          campaign: campaign || null,
          amount: Number(amount),
          currency: "PHP",
          frequency,
          start_date: startDate,
          end_date: endDate || null,
          status: "active",
          notes: notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Pledge recorded");
      qc.invalidateQueries({ queryKey: ["pledges"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canSubmit = !!churchId && !!memberId && !!categoryId && Number(amount) > 0 && !!startDate;

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><HandHeart className="h-4 w-4" /> New pledge</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        {churches.length > 1 && (
          <div className="col-span-2">
            <Label className="text-[12px]">Church</Label>
            <Select value={churchId} onValueChange={setChurchId}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {churches.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="col-span-2">
          <Label className="text-[12px]">Member</Label>
          <Input placeholder="Search…" value={memberQ} onChange={(e) => setMemberQ(e.target.value)} className="h-8 mb-2" />
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Choose member" /></SelectTrigger>
            <SelectContent>
              {(members ?? []).map((m: any) => (
                <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-[12px]">Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Tithes, Missions, Grace giving…" /></SelectTrigger>
            <SelectContent>
              {(cats ?? []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-[12px]">Campaign (optional)</Label>
          <Input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="e.g. New Building Fund" className="h-9" />
        </div>
        <div>
          <Label className="text-[12px]">Amount (₱)</Label>
          <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-[12px]">Frequency</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="one_time">One time</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[12px]">Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-[12px]">End date (optional)</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
        </div>
        <div className="col-span-2">
          <Label className="text-[12px]">Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={!canSubmit || mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? "Saving…" : "Save pledge"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}