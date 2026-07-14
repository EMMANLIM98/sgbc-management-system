import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";

type Feature = { title: string; description: string };

export function ModuleLanding({
  title,
  description,
  icon: Icon,
  tagline,
  features,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  tagline: string;
  features: Feature[];
}) {
  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <PageHeader title={title} description={description} />

      <div className="rounded-xl border border-border bg-card p-10 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-foreground text-background grid place-items-center shrink-0">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Coming soon
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">{tagline}</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              This module is being prepared. Below is a preview of what it will offer once
              available.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-lg border border-border bg-card p-4">
            <div className="text-[13px] font-medium">{f.title}</div>
            <div className="text-[12px] text-muted-foreground mt-1">{f.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
