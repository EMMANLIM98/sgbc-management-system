import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MemberForm } from "@/modules/membership/ui/member-form";
import { PageHeader } from "@/components/shell/page-header";
import { useCurrentChurch } from "@/hooks/use-current-church";

export const Route = createFileRoute("/_authenticated/members/new")({
  head: () => ({ meta: [{ title: "Add member — Shekinah Glory Baptist Church" }] }),
  component: NewMember,
});

function NewMember() {
  const nav = useNavigate();
  const { currentChurchId, churches } = useCurrentChurch();
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="Add member" description="Create a new member record." />
      <MemberForm
        churches={churches}
        defaultChurchId={currentChurchId ?? churches[0]?.id ?? ""}
        onSaved={(id) => nav({ to: "/members/$id", params: { id } })}
      />
    </div>
  );
}
