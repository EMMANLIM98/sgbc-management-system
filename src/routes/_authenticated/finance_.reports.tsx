import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { formatPHP } from "@/lib/money";
import { getFinanceReport } from "@/modules/finance/reports.functions";
import { ArrowLeft, Download, Wallet, HandCoins, ReceiptText, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/finance_/reports")({
  head: () => ({
    meta: [
      { title: "Finance Reports — Church OS" },
      { name: "description", content: "Monthly and annual finance reports with export to PDF." },
    ],
  }),
  component: FinanceReportsPage,
});

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function FinanceReportsPage() {
  const { currentChurchId, currentChurch, churches } = useCurrentChurch();
  const now = new Date();
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => now.getFullYear() - i), []);

  const scopeLabel = currentChurchId ? currentChurch?.name ?? "Church" : `All Churches (${churches.length})`;
  const periodLabel = period === "monthly" ? `${MONTHS[month - 1]} ${year}` : `Year ${year}`;

  const fn = useServerFn(getFinanceReport);
  const { data: report, isLoading } = useQuery({
    queryKey: ["fin-report", currentChurchId, period, year, month],
    queryFn: () => fn({ data: { church_id: currentChurchId, period, year, month: period === "monthly" ? month : undefined } }),
  });

  async function onExportPdf() {
    if (!report) return;
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;
    let y = 48;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Finance Report", marginX, y);
    y += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`${periodLabel}  ·  ${scopeLabel}`, marginX, y);
    y += 12;
    doc.text(`Range: ${report.range.start} → ${report.range.end}`, marginX, y);
    y += 12;
    doc.text(`Generated ${new Date().toLocaleString()}`, marginX, y);
    y += 20;

    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Summary", marginX, y);
    y += 6;

    autoTable(doc, {
      startY: y + 4,
      head: [["Metric", "Amount"]],
      body: [
        ["Total Giving", formatPHP(report.giving_total)],
        ["Total Expenses", formatPHP(report.expenses_total)],
        ["Net", formatPHP(report.net_total)],
        ["Giving transactions", String(report.transaction_counts.giving)],
        ["Expense transactions", String(report.transaction_counts.expenses)],
      ],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255 },
      columnStyles: { 1: { halign: "right" } },
      margin: { left: marginX, right: marginX },
    });

    if (report.giving_by_category.length) {
      autoTable(doc, {
        head: [["Giving by category", "Amount"]],
        body: report.giving_by_category.map((c) => [c.name, formatPHP(c.amount)]),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [30, 30, 30], textColor: 255 },
        columnStyles: { 1: { halign: "right" } },
        margin: { left: marginX, right: marginX },
      });
    }

    if (report.expenses_by_category.length) {
      autoTable(doc, {
        head: [["Expenses by category", "Amount"]],
        body: report.expenses_by_category.map((c) => [c.name, formatPHP(c.amount)]),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [30, 30, 30], textColor: 255 },
        columnStyles: { 1: { halign: "right" } },
        margin: { left: marginX, right: marginX },
      });
    }

    if (report.by_church.length) {
      autoTable(doc, {
        head: [["Church", "Giving", "Expenses", "Net"]],
        body: report.by_church.map((r) => [r.name, formatPHP(r.giving), formatPHP(r.expenses), formatPHP(r.net)]),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [30, 30, 30], textColor: 255 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
        margin: { left: marginX, right: marginX },
      });
    }

    autoTable(doc, {
      head: [[period === "monthly" ? "Day" : "Month", "Giving", "Expenses", "Net"]],
      body: report.trend.map((t) => [
        t.label, formatPHP(t.giving), formatPHP(t.expenses), formatPHP(t.giving - t.expenses),
      ]),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      margin: { left: marginX, right: marginX },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(`Church OS  ·  ${periodLabel}  ·  ${scopeLabel}`, marginX, doc.internal.pageSize.getHeight() - 20);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - marginX, doc.internal.pageSize.getHeight() - 20, { align: "right" });
    }

    const fname = `finance-${period}-${year}${period === "monthly" ? `-${String(month).padStart(2, "0")}` : ""}.pdf`;
    doc.save(fname);
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Finance Reports"
        description={`${periodLabel} — ${scopeLabel}`}
        actions={
          <>
            <Link to="/finance" className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] rounded-md border border-border hover:bg-accent">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
            <button
              onClick={onExportPdf}
              disabled={!report}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] rounded-md bg-foreground text-background hover:opacity-90 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> Export PDF
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          {(["monthly", "annual"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 h-8 text-[12px] capitalize ${period === p ? "bg-foreground text-background" : "hover:bg-accent"}`}
            >
              {p}
            </button>
          ))}
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="h-8 px-2 text-[12px] rounded-md border border-border bg-background"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {period === "monthly" && (
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-8 px-2 text-[12px] rounded-md border border-border bg-background"
          >
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KPI icon={HandCoins} label="Giving" value={formatPHP(report?.giving_total)} />
        <KPI icon={ReceiptText} label="Expenses" value={formatPHP(report?.expenses_total)} />
        <KPI icon={Wallet} label="Net" value={formatPHP(report?.net_total)} sub={(report?.net_total ?? 0) >= 0 ? "surplus" : "deficit"} />
        <KPI icon={TrendingUp} label="Transactions" value={`${(report?.transaction_counts.giving ?? 0) + (report?.transaction_counts.expenses ?? 0)}`}
          sub={`${report?.transaction_counts.giving ?? 0} giving · ${report?.transaction_counts.expenses ?? 0} expenses`} />
      </div>

      <div className="border border-border rounded-lg bg-card p-4 mb-6">
        <div className="text-[13px] font-medium mb-1">Trend</div>
        <div className="text-[11px] text-muted-foreground mb-3">
          {period === "monthly" ? "Daily giving vs expenses" : "Monthly giving vs expenses"}
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={report?.trend ?? []} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" />
              <XAxis dataKey="label" fontSize={11} stroke="oklch(0.5 0.01 260)" tickLine={false} axisLine={false} />
              <YAxis fontSize={11} stroke="oklch(0.5 0.01 260)" tickLine={false} axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(v: any) => formatPHP(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="giving" name="Giving" stroke="oklch(0.62 0.15 158)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="oklch(0.65 0.18 25)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <CategoryTable title="Giving by category" rows={report?.giving_by_category ?? []} />
        <CategoryTable title="Expenses by category" rows={report?.expenses_by_category ?? []} />
      </div>

      {!currentChurchId && (report?.by_church.length ?? 0) > 0 && (
        <div className="border border-border rounded-lg bg-card mb-6">
          <div className="px-4 py-3 border-b border-border text-[13px] font-medium">By church</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left font-medium px-4 py-2">Church</th>
                  <th className="text-right font-medium px-4 py-2">Giving</th>
                  <th className="text-right font-medium px-4 py-2">Expenses</th>
                  <th className="text-right font-medium px-4 py-2">Net</th>
                </tr>
              </thead>
              <tbody>
                {report!.by_church.map((r) => (
                  <tr key={r.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2 text-right tabular">{formatPHP(r.giving)}</td>
                    <td className="px-4 py-2 text-right tabular text-muted-foreground">{formatPHP(r.expenses)}</td>
                    <td className={`px-4 py-2 text-right tabular font-medium ${r.net >= 0 ? "" : "text-destructive"}`}>{formatPHP(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="border border-border rounded-lg bg-card">
        <div className="px-4 py-3 border-b border-border text-[13px] font-medium">
          {period === "monthly" ? "Daily breakdown" : "Monthly breakdown"}
        </div>
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0 bg-card">
              <tr className="border-b border-border">
                <th className="text-left font-medium px-4 py-2">{period === "monthly" ? "Day" : "Month"}</th>
                <th className="text-right font-medium px-4 py-2">Giving</th>
                <th className="text-right font-medium px-4 py-2">Expenses</th>
                <th className="text-right font-medium px-4 py-2">Net</th>
              </tr>
            </thead>
            <tbody>
              {(report?.trend ?? []).map((t) => (
                <tr key={t.key} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">{t.label}</td>
                  <td className="px-4 py-2 text-right tabular">{formatPHP(t.giving)}</td>
                  <td className="px-4 py-2 text-right tabular text-muted-foreground">{formatPHP(t.expenses)}</td>
                  <td className={`px-4 py-2 text-right tabular font-medium ${t.giving - t.expenses >= 0 ? "" : "text-destructive"}`}>
                    {formatPHP(t.giving - t.expenses)}
                  </td>
                </tr>
              ))}
              {!isLoading && (report?.trend ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No data for this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CategoryTable({ title, rows }: { title: string; rows: { name: string; amount: number }[] }) {
  const total = rows.reduce((a, r) => a + r.amount, 0);
  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="px-4 py-3 border-b border-border text-[13px] font-medium">{title}</div>
      {rows.length === 0 ? (
        <div className="px-4 py-10 text-center text-[12px] text-muted-foreground">No data.</div>
      ) : (
        <table className="w-full text-[13px]">
          <tbody>
            {rows.map((r) => {
              const pct = total > 0 ? Math.round((r.amount / total) * 100) : 0;
              return (
                <tr key={r.name} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 w-1/2 truncate">{r.name}</td>
                  <td className="px-4 py-2">
                    <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                      <div className="h-full bg-foreground/70" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right tabular whitespace-nowrap">{formatPHP(r.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="border border-border rounded-lg bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}