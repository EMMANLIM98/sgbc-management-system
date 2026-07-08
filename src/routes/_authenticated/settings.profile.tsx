import { createFileRoute } from "@tanstack/react-router";
import { useMyContext } from "@/hooks/use-my-context";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { updateMyProfile } from "@/modules/tenancy/tenancy.functions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  component: ProfileSettings,
});

function ProfileSettings() {
  const { data } = useMyContext();
  const qc = useQueryClient();
  const fn = useServerFn(updateMyProfile);
  const { register, handleSubmit } = useForm({
    values: { full_name: data?.user.full_name ?? "", phone: "" },
  });
  const mut = useMutation({
    mutationFn: (v: any) => fn({ data: v }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["me-context"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="border border-border rounded-lg bg-card p-5 space-y-4 max-w-lg">
      <div>
        <h2 className="text-[14px] font-medium">Your profile</h2>
        <p className="text-[12px] text-muted-foreground">{data?.user.email}</p>
      </div>
      <div className="space-y-1.5"><Label className="text-[12px]">Full name</Label><Input {...register("full_name", { required: true })} /></div>
      <div className="space-y-1.5"><Label className="text-[12px]">Phone</Label><Input {...register("phone")} /></div>
      <div className="flex justify-end"><Button type="submit" disabled={mut.isPending}>Save</Button></div>
    </form>
  );
}
