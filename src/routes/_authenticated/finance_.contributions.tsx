import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
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
  listGivingCategories, listMemberPicker, listContributions,
  createContribution, deleteContribution, getMemberGivingSummary,
} from "@/modules/finance/contributions.functions";
import { HandCoins, Plus, Search, Trash2, User, Users, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance/contributions")({
  head: () => ({
    meta: [
      { title: "Giving — Finance" },
      { name: "description", content: "Track member giving: tithes, offering, missions & grace commitments." },
    ],
  }),
  component: ContributionsPage,
});

function ContributionsPage() {
  const { currentChurchId, currentChurch, churches } = useCurrentChurch();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [memberId, setMemberId] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const catsFn = useServerFn(listGivingCategories);
  const membersFn = useServerFn(listMemberPicker);
  const listFn = useServerFn(listContributions);
  const topFn = useServerFn(getMemberGivingSummary);
  const delFn = useServerFn(deleteContribution);

  const { data: cats } = useQuery({
    queryKey: ["giving-cats", currentChurchId],
    queryFn: () => catsFn({ data: { church_id: currentChurchId } }),
  });
  const { data: members } = useQuery({
    queryKey: ["giving-members", currentChurchId, q],
    queryFn: () => membersFn({ data: { church_id: currentChurchId, q, limit: 50 } }),
  });
  const { data: list } = useQuery({
    queryKey: ["contributions", currentChurchId, categoryId, memberId],
    queryFn: () => listFn({
      data: {
        church_id: currentChurchId,
        category_id: categoryId === "all" ? null : categoryId,
        member_id: memberId === "all" ? null : memberId,
      },
    }),
  });
  const { data: topGivers } = useQuery({
    queryKey: ["top-givers", currentChurchId],
    queryFn: () => topFn({ data: { church_id: currentChurchId, limit: 5 } }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["contributions"] });
      qc.invalidateQueries({ queryKey: ["top-givers"] });
      qc.invalidateQueries({ queryKey: ["fin-kpis"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const scopeLabel = currentChurchId ? currentChurch?.name ?? "Church" : `All Churches (${churches.length})`;
  const totalShown = useMemo(
    () => (list?.rows ?? []).reduce((a: number, r: any) => a + Number(r.amount), 0),
    [list],
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-2">
        <Link to="/finance" className="text-[12px] text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Finance
        </Link>
      </div>
      <PageHeader
        title="Giving"
        description={`Tithes, offering, missions & grace giving — ${scopeLabel}`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Record giving
              </Button>
            </DialogTrigger>
            <RecordGivingDialog
              onClose={() => setOpen(false)}
              defaultChurchId={currentChurchId ?? churches[0]?.id ?? ""}
              churches={churches}
            />
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
        <div className="lg:col-span-3 border border-border rounded-lg bg-card">
          <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search member…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-8 pl-8 text-[13px]"
              />
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-8 w-[180px] text-[13px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(cats ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger className="h-8 w-[200px] text-[13px]"><SelectValue placeholder="Member" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                {(members ?? []).map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto text-[12px] text-muted-foreground">
              {list?.count ?? 0} entries · <span className="font-medium text-foreground tabular">{formatPHP(totalShown)}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left font-medium px-4 py-2">Date</th>
                  <th className="text-left font-medium px-4 py-2">Member</th>
                  <th className="text-left font-medium px-4 py-2">Category</th>
                  <th className="text-left font-medium px-4 py-2">Method</th>
                  {!currentChurchId && <th className="text-left font-medium px-4 py-2">Church</th>}
                  <th className="text-right font-medium px-4 py-2">Amount</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {(list?.rows ?? []).map((r: any) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(r.occurred_on).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      {r.members ? (
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {r.members.first_name} {r.members.last_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Anonymous</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: r.finance_categories?.color ?? "hsl(var(--muted-foreground))" }}
                        />
                        {r.finance_categories?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 capitalize text-muted-foreground">{r.method ?? "—"}</td>
                    {!currentChurchId && <td className="px-4 py-2 text-muted-foreground">{r.churches?.name}</td>}
                    <td className="px-4 py-2 text-right font-medium tabular">{formatPHP(Number(r.amount))}</td>
                    <td className="px-2 py-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-1 text-muted-foreground hover:text-destructive" aria-label="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this giving entry?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => delMut.mutate(r.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
                {(list?.rows ?? []).length === 0 && (
                  <tr>
                    <td colSpan={currentChurchId ? 6 : 7} className="px-4 py-12 text-center text-muted-foreground text-[13px]">
                      No giving recorded yet. Click <span className="font-medium text-foreground">Record giving</span> to add the first entry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-border rounded-lg bg-card p-4">
          <div className="flex items-center gap-2 text-[13px] font-medium">
            <Users className="h-3.5 w-3.5" /> Top givers (YTD)
          </div>
          <div className="text-[11px] text-muted-foreground mb-3">By total contributions this year</div>
          {(topGivers ?? []).length === 0 ? (
            <div className="text-[12px] text-muted-foreground py-6 text-center">No named giving recorded yet.</div>
          ) : (
            <ul className="space-y-2">
              {(topGivers ?? []).map((g: any, i: number) => (
                <li key={g.id} className="flex items-center gap-3 text-[13px]">
                  <div className="h-6 w-6 rounded-full bg-accent grid place-items-center text-[11px] font-medium">
                    {i + 1}
                  </div>
                  <Link to="/members/$id" params={{ id: g.id }} className="flex-1 min-w-0 truncate hover:underline">
                    {g.name}
                  </Link>
                  <div className="text-right">
                    <div className="tabular font-medium">{formatPHP(g.total)}</div>
                    <div className="text-[10px] text-muted-foreground">{g.count} entries</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordGivingDialog({
  onClose, defaultChurchId, churches,
}: {
  onClose: () => void;
  defaultChurchId: string;
  churches: { id: string; name: string }[];
}) {
  const qc = useQueryClient();
  const [churchId, setChurchId] = useState(defaultChurchId);
  const [categoryId, setCategoryId] = useState<string>("");
  const [memberId, setMemberId] = useState<string>("anonymous");
  const [memberQ, setMemberQ] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => new Date().toISOString().slice(0, 10));

  const catsFn = useServerFn(listGivingCategories);
  const membersFn = useServerFn(listMemberPicker);
  const createFn = useServerFn(createContribution);

  const { data: cats } = useQuery({
    queryKey: ["giving-cats", churchId],
    queryFn: () => catsFn({ data: { church_id: churchId } }),
    enabled: !!churchId,
  });
  const { data: members } = useQuery({
    queryKey: ["giving-members-dlg", churchId, memberQ],
    queryFn: () => membersFn({ data: { church_id: churchId, q: memberQ, limit: 30 } }),
    enabled: !!churchId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          church_id: churchId,
          category_id: categoryId,
          member_id: memberId === "anonymous" ? null : memberId,
          amount: Number(amount),
          currency: "PHP",
          method: (method as any) || null,
          reference: reference || null,
          note: note || null,
          occurred_on: occurredOn,
        },
      }),
    onSuccess: () => {
      toast.success("Giving recorded");
      qc.invalidateQueries({ queryKey: ["contributions"] });
      qc.invalidateQueries({ queryKey: ["top-givers"] });
      qc.invalidateQueries({ queryKey: ["fin-kpis"] });
      qc.invalidateQueries({ queryKey: ["fin-trend"] });
      qc.invalidateQueries({ queryKey: ["fin-cats"] });
      qc.invalidateQueries({ queryKey: ["fin-act"] });
      qc.invalidateQueries({ queryKey: ["fin-by-church"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canSubmit = !!churchId && !!categoryId && Number(amount) > 0 && !!occurredOn;

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <HandCoins className="h-4 w-4" /> Record giving
        </DialogTitle>
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
          <Label className="text-[12px]">Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Tithes, Offering, Missions…" /></SelectTrigger>
            <SelectContent>
              {(cats ?? []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color ?? "currentColor" }} />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label className="text-[12px]">Member</Label>
          <Input
            placeholder="Search member…"
            value={memberQ}
            onChange={(e) => setMemberQ(e.target.value)}
            className="h-8 mb-2"
          />
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="anonymous">Anonymous / unnamed</SelectItem>
              {(members ?? []).map((m: any) => (
                <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[12px]">Amount (₱)</Label>
          <Input
            type="number" min="0" step="0.01" inputMode="decimal"
            value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9"
          />
        </div>
        <div>
          <Label className="text-[12px]">Date</Label>
          <Input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} className="h-9" />
        </div>

        <div>
          <Label className="text-[12px]">Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="bank">Bank transfer</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[12px]">Reference</Label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="OR # / txn id" className="h-9" />
        </div>

        <div className="col-span-2">
          <Label className="text-[12px]">Note</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={!canSubmit || createMut.isPending} onClick={() => createMut.mutate()}>
          {createMut.isPending ? "Saving…" : "Save giving"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}