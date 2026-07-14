import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import {
  getMember,
  archiveMember,
  transferMember,
} from "@/modules/membership/membership.functions";
import { MemberForm } from "@/modules/membership/ui/member-form";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowRightLeft, Archive } from "lucide-react";

export const Route = createFileRoute("/_authenticated/members/$id")({
  head: () => ({ meta: [{ title: "Member — Shekinah Glory Baptist Church" }] }),
  component: MemberPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">{error.message}</div>
  ),
});

function MemberPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { churches } = useCurrentChurch();
  const getFn = useServerFn(getMember);
  const archiveFn = useServerFn(archiveMember);
  const transferFn = useServerFn(transferMember);

  const { data, isLoading } = useQuery({
    queryKey: ["member", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const archive = useMutation({
    mutationFn: () => archiveFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Member archived");
      qc.invalidateQueries({ queryKey: ["member", id] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [transferOpen, setTransferOpen] = useState(false);
  const [toChurch, setToChurch] = useState<string>("");
  const [reason, setReason] = useState("");
  const transfer = useMutation({
    mutationFn: () => transferFn({ data: { id, to_church_id: toChurch, reason } }),
    onSuccess: () => {
      toast.success("Member transferred");
      setTransferOpen(false);
      qc.invalidateQueries({ queryKey: ["member", id] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="p-6 text-muted-foreground">Loading…</div>;
  const m = data.member;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="text-[12px] text-muted-foreground mb-2">
        <Link to="/members" className="hover:underline">
          Members
        </Link>{" "}
        / {m.first_name} {m.last_name}
      </div>
      <PageHeader
        title={`${m.first_name} ${m.last_name}`}
        description={`${m.churches?.name ?? ""} · ${m.membership_status}`}
        actions={
          <>
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowRightLeft className="h-4 w-4 mr-1.5" />
                  Transfer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transfer member</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-[12px]">Destination church</Label>
                    <Select value={toChurch} onValueChange={setToChurch}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose church" />
                      </SelectTrigger>
                      <SelectContent>
                        {churches
                          .filter((c) => c.id !== m.church_id)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[12px]">Reason (optional)</Label>
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTransferOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => transfer.mutate()}
                    disabled={!toChurch || transfer.isPending}
                  >
                    Transfer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              size="sm"
              onClick={() => archive.mutate()}
              disabled={archive.isPending}
            >
              <Archive className="h-4 w-4 mr-1.5" />
              Archive
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="transfers">Transfers ({data.transfers.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Info label="Email" value={m.email} />
            <Info label="Phone" value={m.phone} />
            <Info label="Address" value={m.address} />
            <Info label="Birthdate" value={m.birthdate} />
            <Info label="Civil status" value={m.civil_status} />
            <Info label="Sex" value={m.sex} />
            <Info label="Joined" value={m.joined_at} />
            <Info
              label="Baptism"
              value={
                m.baptism_date
                  ? `${m.baptism_date}${m.baptism_church ? " · " + m.baptism_church : ""}`
                  : null
              }
            />
          </div>
          {m.notes && (
            <div className="mt-4 border border-border rounded-md p-3 bg-card text-[13px] whitespace-pre-wrap">
              {m.notes}
            </div>
          )}
        </TabsContent>
        <TabsContent value="edit" className="mt-4">
          <MemberForm
            churches={churches}
            defaultChurchId={m.church_id}
            initial={m as any}
            onSaved={() => {
              toast.success("Saved");
              qc.invalidateQueries({ queryKey: ["member", id] });
            }}
          />
        </TabsContent>
        <TabsContent value="transfers" className="mt-4">
          <div className="border border-border rounded-lg bg-card">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">From</th>
                  <th className="px-4 py-2 font-medium">To</th>
                  <th className="px-4 py-2 font-medium">Reason</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.transfers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No transfers yet.
                    </td>
                  </tr>
                )}
                {data.transfers.map((t: any) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2">{t.from?.name ?? "—"}</td>
                    <td className="px-4 py-2">{t.to?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{t.reason ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground tabular">
                      {new Date(t.transferred_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-border rounded-md p-3 bg-card">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[13px] mt-1">{value || "—"}</div>
    </div>
  );
}
