import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { listMembers } from "@/modules/membership/membership.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatNumber } from "@/lib/money";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/members/")({
  component: MembersList,
});

const STATUS_LABEL: Record<string, string> = {
  visitor: "Visitor", regular: "Regular", member: "Member", inactive: "Inactive", transferred: "Transferred",
};

function MembersList() {
  const { currentChurchId, currentChurch, churches } = useCurrentChurch();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const fn = useServerFn(listMembers);
  const { data, isLoading } = useQuery({
    queryKey: ["members", currentChurchId, q, status, page],
    queryFn: () =>
      fn({
        data: {
          church_id: currentChurchId,
          q,
          status: status === "all" ? null : (status as any),
          page,
          page_size: pageSize,
          sort: "name_asc",
        },
      }),
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const scopeLabel = currentChurchId ? currentChurch?.name ?? "Church" : `All Churches (${churches.length})`;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Membership"
        description={`${formatNumber(total)} people — ${scopeLabel}`}
        actions={
          <Button asChild size="sm">
            <Link to="/members/new"><Plus className="h-4 w-4 mr-1.5" />Add member</Link>
          </Button>
        }
      />

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search name or email…"
            className="pl-8 h-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="visitor">Visitor</SelectItem>
            <SelectItem value="regular">Regular</SelectItem>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="transferred">Transferred</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Church</th>
              <th className="px-4 py-2 font-medium">Contact</th>
              <th className="px-4 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                No members yet. <Link to="/members/new" className="underline">Add your first</Link>.
              </td></tr>
            )}
            {rows.map((m: any) => (
              <tr key={m.id} className="hover:bg-accent/40">
                <td className="px-4 py-2">
                  <Link to="/members/$id" params={{ id: m.id }} className="font-medium hover:underline">
                    {m.last_name}, {m.first_name}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <StatusPill status={m.membership_status} />
                </td>
                <td className="px-4 py-2 text-muted-foreground">{m.churches?.name ?? "—"}</td>
                <td className="px-4 py-2 text-muted-foreground">{m.email ?? m.phone ?? "—"}</td>
                <td className="px-4 py-2 text-muted-foreground tabular">
                  {m.joined_at
                    ? new Date(m.joined_at).toLocaleDateString()
                    : formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-3 text-[12px] text-muted-foreground">
          <div>
            Page {page} of {pages} · {formatNumber(total)} total
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    member: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    regular: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    visitor: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    inactive: "bg-muted text-muted-foreground border-border",
    transferred: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={"inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] " + (map[status] ?? "")}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
