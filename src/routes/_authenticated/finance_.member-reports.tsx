import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { formatPHP } from "@/lib/money";
import { getMemberGivingReport } from "@/modules/finance/member-reports.functions";
import { toCsv, downloadCsv } from "@/lib/csv";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Search, Users, FileDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance_/member-reports")({
  head: () => ({
    meta: [
      { title: "Member giving report — Finance" },
      { name: "description", content: "Total giving per member with breakdown by category." },
    ],
  }),
  component: MemberReportsPage,
});

function MemberReportsPage() {
  const { currentChurchId, currentChurch, churches } = useCurrentChurch();
  const now = new Date();
  const [from, setFrom] = useState(`${now.getFullYear()}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState("");

  const fn = useServerFn(getMemberGivingReport);
  const { data } = useQuery({
    queryKey: ["member-giving-report", currentChurchId, from, to],
    queryFn: () => fn({ data: { church_id: currentChurchId, from, to, limit: 500 } }),
  });

  const filtered = useMemo(
    () =>
      (data?.members ?? []).filter((m) =>
        q ? m.name.toLowerCase().includes(q.toLowerCase()) : true,
      ),
    [data, q],
  );

  const scopeLabel = currentChurchId
    ? (currentChurch?.name ?? "Church")
    : `All Churches (${churches.length})`;

  function exportCsv() {
    if (!data) return;
    const header = ["Member", "Entries", "Last gift", ...data.categories, "Total"];
    const rows: (string | number)[][] = [header];
    for (const m of filtered) {
      rows.push([
        m.name,
        m.count,
        m.last_gift ?? "",
        ...data.categories.map((c) => m.by_category[c] ?? 0),
        m.total,
      ]);
    }
    rows.push([
      "TOTAL",
      filtered.reduce((a, m) => a + m.count, 0),
      "",
      ...data.categories.map((c) => filtered.reduce((a, m) => a + (m.by_category[c] ?? 0), 0)),
      filtered.reduce((a, m) => a + m.total, 0),
    ]);
    downloadCsv(`member-giving-${from}_to_${to}.csv`, toCsv(rows));
  }

  async function exportPdf() {
    if (!data) return;
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Member Giving Report", 40, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(`${scopeLabel}  ·  ${from} → ${to}`, 40, 56);
    doc.setTextColor(0);
    autoTable(doc, {
      startY: 72,
      head: [["Member", "Entries", "Last gift", ...data.categories, "Total"]],
      body: filtered.map((m) => [
        m.name,
        String(m.count),
        m.last_gift ?? "",
        ...data.categories.map((c) => formatPHP(m.by_category[c] ?? 0)),
        formatPHP(m.total),
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255 },
      margin: { left: 40, right: 40 },
    });
    doc.save(`member-giving-${from}_to_${to}.pdf`);
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-2">
        <Link
          to="/finance"
          className="text-[12px] text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Finance
        </Link>
      </div>
      <PageHeader
        title="Member giving report"
        description={`${scopeLabel} · ${from} → ${to}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              disabled={!data?.members.length}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] rounded-md border border-border hover:bg-accent disabled:opacity-50"
            >
              <FileDown className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              onClick={exportPdf}
              disabled={!data?.members.length}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] rounded-md bg-foreground text-background hover:opacity-90 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="text-[12px] text-muted-foreground">From</label>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-8 w-[160px]"
        />
        <label className="text-[12px] text-muted-foreground">To</label>
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-8 w-[160px]"
        />
        <div className="relative ml-auto">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search member…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-8 pl-8 w-[220px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Members" value={String(filtered.length)} />
        <Stat label="Total giving" value={formatPHP(filtered.reduce((a, m) => a + m.total, 0))} />
        <Stat label="Categories" value={String((data?.categories ?? []).length)} />
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
              <tr className="border-b border-border">
                <th className="text-left font-medium px-4 py-2 sticky left-0 bg-muted/40">
                  Member
                </th>
                <th className="text-right font-medium px-3 py-2">Entries</th>
                <th className="text-left font-medium px-3 py-2">Last gift</th>
                {(data?.categories ?? []).map((c) => (
                  <th key={c} className="text-right font-medium px-3 py-2 whitespace-nowrap">
                    {c}
                  </th>
                ))}
                <th className="text-right font-medium px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-2 sticky left-0 bg-card">
                    <Link
                      to="/finance/members/$id"
                      params={{ id: m.id }}
                      className="hover:underline"
                    >
                      {m.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular text-muted-foreground">{m.count}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {m.last_gift ? new Date(m.last_gift).toLocaleDateString() : "—"}
                  </td>
                  {(data?.categories ?? []).map((c) => (
                    <td key={c} className="px-3 py-2 text-right tabular">
                      {m.by_category[c] ? (
                        formatPHP(m.by_category[c])
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right tabular font-semibold">
                    {formatPHP(m.total)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4 + (data?.categories ?? []).length}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No member giving in this range.
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
        <Users className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular">{value}</div>
    </div>
  );
}
