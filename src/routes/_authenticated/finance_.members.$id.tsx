import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shell/page-header";
import { formatPHP } from "@/lib/money";
import { getMemberContributionHistory } from "@/modules/finance/member-reports.functions";
import { downloadReceiptPdf } from "@/lib/receipt";
import { toCsv, downloadCsv } from "@/lib/csv";
import { ArrowLeft, Download, FileText, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance_/members/$id")({
  head: () => ({
    meta: [
      { title: "Member giving history — Finance" },
      {
        name: "description",
        content: "Complete contribution history with breakdown by giving type and receipts.",
      },
    ],
  }),
  component: MemberHistoryPage,
});

function MemberHistoryPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getMemberContributionHistory);
  const { data, isLoading } = useQuery({
    queryKey: ["member-history", id],
    queryFn: () => fn({ data: { member_id: id } }),
  });

  const memberName = data?.member ? `${data.member.first_name} ${data.member.last_name}` : "Member";

  function exportCsv() {
    if (!data) return;
    const rows: (string | number)[][] = [
      ["Date", "Category", "Method", "Reference", "Amount", "Note"],
      ...data.rows.map((r: any) => [
        r.occurred_on,
        r.finance_categories?.name ?? "",
        r.method ?? "",
        r.reference ?? "",
        Number(r.amount),
        r.note ?? "",
      ]),
    ];
    downloadCsv(`giving-${memberName.replace(/\s+/g, "-").toLowerCase()}.csv`, toCsv(rows));
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-2">
        <Link
          to="/finance/contributions"
          className="text-[12px] text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Giving
        </Link>
      </div>
      <PageHeader
        title={memberName}
        description="Complete contribution history"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/members/$id"
              params={{ id }}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] rounded-md border border-border hover:bg-accent"
            >
              <User className="h-3.5 w-3.5" /> Member profile
            </Link>
            <button
              onClick={exportCsv}
              disabled={!data?.rows.length}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] rounded-md bg-foreground text-background hover:opacity-90 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="border border-border rounded-lg bg-card p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Lifetime giving
          </div>
          <div className="mt-2 text-2xl font-semibold tabular">{formatPHP(data?.total)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{data?.count ?? 0} entries</div>
        </div>
        <div className="border border-border rounded-lg bg-card p-4 md:col-span-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Breakdown by giving type
          </div>
          {(data?.by_category ?? []).length === 0 ? (
            <div className="text-[12px] text-muted-foreground">No giving recorded.</div>
          ) : (
            <ul className="space-y-2">
              {data!.by_category.map((c: any) => {
                const pct = data!.total > 0 ? Math.round((c.total / data!.total) * 100) : 0;
                return (
                  <li key={c.id}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: c.color ?? "currentColor" }}
                        />
                        {c.name}
                        <span className="text-muted-foreground">· {c.count}</span>
                      </span>
                      <span className="tabular">
                        {formatPHP(c.total)} <span className="text-muted-foreground">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                      <div className="h-full bg-foreground/70" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {(data?.by_year ?? []).length > 0 && (
        <div className="border border-border rounded-lg bg-card mb-4">
          <div className="px-4 py-3 border-b border-border text-[13px] font-medium">By year</div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
            {data!.by_year.map((y) => (
              <div key={y.year}>
                <div className="text-[11px] text-muted-foreground">{y.year}</div>
                <div className="text-[15px] font-medium tabular">{formatPHP(y.total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border border-border rounded-lg bg-card">
        <div className="px-4 py-3 border-b border-border text-[13px] font-medium">
          All contributions
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left font-medium px-4 py-2">Date</th>
                <th className="text-left font-medium px-4 py-2">Category</th>
                <th className="text-left font-medium px-4 py-2">Method</th>
                <th className="text-left font-medium px-4 py-2">Reference</th>
                <th className="text-right font-medium px-4 py-2">Amount</th>
                <th className="text-right font-medium px-4 py-2 w-24">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((r: any) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {new Date(r.occurred_on).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: r.finance_categories?.color ?? "currentColor" }}
                      />
                      {r.finance_categories?.name ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2 capitalize text-muted-foreground">{r.method ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.reference ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular font-medium">
                    {formatPHP(Number(r.amount))}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={async () => {
                        try {
                          await downloadReceiptPdf({
                            ...r,
                            amount: Number(r.amount),
                            members: data?.member ?? null,
                          });
                        } catch (e: any) {
                          toast.error(e.message ?? "Failed to generate receipt");
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
                    >
                      <FileText className="h-3.5 w-3.5" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && (data?.rows ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No contributions on record.
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
