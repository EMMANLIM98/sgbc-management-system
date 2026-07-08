import { createFileRoute } from "@tanstack/react-router";
import { useMyContext } from "@/hooks/use-my-context";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { updateOrganization } from "@/modules/tenancy/tenancy.functions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/organization")({
  component: OrgSettings,
});

function OrgSettings() {
  const { data } = useMyContext();
  const qc = useQueryClient();
  const fn = useServerFn(updateOrganization);
  const org = data?.organizations[0];
  const { register, handleSubmit } = useForm({ values: { name: org?.name ?? "" } });
  const mut = useMutation({
    mutationFn: (v: { name: string }) => fn({ data: { id: org!.id, name: v.name } }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["me-context"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  if (!org) return null;
  return (
    <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="border border-border rounded-lg bg-card p-5 space-y-4 max-w-lg">
      <div>
        <h2 className="text-[14px] font-medium">Organization</h2>
        <p className="text-[12px] text-muted-foreground">Parent of all your churches.</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px]">Name</Label>
        <Input {...register("name", { required: true })} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={mut.isPending}>Save changes</Button>
      </div>
    </form>
  );
}
