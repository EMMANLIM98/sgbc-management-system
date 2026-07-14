import { createFileRoute } from "@tanstack/react-router";
import { useMyContext } from "@/hooks/use-my-context";
import { useServerFn } from "@tanstack/react-start";
import { listOrgTeam } from "@/modules/tenancy/tenancy.functions";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/settings/team")({
  component: TeamSettings,
});

function TeamSettings() {
  const { data: ctx } = useMyContext();
  const org = ctx?.organizations[0];
  const fn = useServerFn(listOrgTeam);
  const { data: team } = useQuery({
    queryKey: ["team", org?.id],
    queryFn: () => fn({ data: { organization_id: org!.id } }),
    enabled: !!org,
  });
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-[14px] font-medium">Team</h2>
        <p className="text-[12px] text-muted-foreground">
          People with access to your organization. Invite flow ships next.
        </p>
      </div>
      <div className="border border-border rounded-lg bg-card divide-y divide-border">
        {(team ?? []).map((m: any) => (
          <div key={m.user_id} className="p-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-accent grid place-items-center text-[11px] font-medium">
              {(m.profiles?.full_name ?? "?")[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{m.profiles?.full_name}</div>
              <div className="text-[11px] text-muted-foreground">{m.profiles?.email}</div>
            </div>
            <div className="text-[11px] px-1.5 py-0.5 border border-border rounded-md text-muted-foreground">
              {m.is_owner ? "Owner" : m.is_org_admin ? "Org admin" : "Member"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
