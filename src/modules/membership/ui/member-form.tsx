import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createMember, updateMember } from "@/modules/membership/membership.functions";
import { toast } from "sonner";
import type { ChurchLite } from "@/modules/tenancy/tenancy.functions";
import { Loader2 } from "lucide-react";

type Values = {
  id?: string;
  church_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  suffix?: string | null;
  sex?: "male" | "female" | "" | null;
  birthdate?: string | null;
  civil_status?: any;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  membership_status: "visitor" | "regular" | "member" | "inactive" | "transferred";
  joined_at?: string | null;
  baptism_date?: string | null;
  baptism_church?: string | null;
  wedding_date?: string | null;
  notes?: string | null;
};

export function MemberForm({
  churches, defaultChurchId, initial, onSaved,
}: {
  churches: ChurchLite[];
  defaultChurchId: string;
  initial?: Partial<Values> & { id?: string };
  onSaved?: (id: string) => void;
}) {
  const createFn = useServerFn(createMember);
  const updateFn = useServerFn(updateMember);
  const editing = !!initial?.id;

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<Values>({
    defaultValues: {
      church_id: initial?.church_id ?? defaultChurchId,
      first_name: initial?.first_name ?? "",
      last_name: initial?.last_name ?? "",
      middle_name: initial?.middle_name ?? "",
      suffix: initial?.suffix ?? "",
      sex: (initial?.sex as any) ?? "",
      birthdate: initial?.birthdate ?? "",
      civil_status: initial?.civil_status ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      address: initial?.address ?? "",
      membership_status: initial?.membership_status ?? "visitor",
      joined_at: initial?.joined_at ?? "",
      baptism_date: initial?.baptism_date ?? "",
      baptism_church: initial?.baptism_church ?? "",
      wedding_date: initial?.wedding_date ?? "",
      notes: initial?.notes ?? "",
      id: initial?.id,
    },
  });

  const submit = useMutation({
    mutationFn: async (values: Values) => {
      const clean: any = { ...values };
      if (!clean.sex) clean.sex = null;
      if (!clean.civil_status) clean.civil_status = null;
      for (const k of ["birthdate", "joined_at", "baptism_date", "wedding_date"]) {
        if (!clean[k]) clean[k] = null;
      }
      if (editing) {
        await updateFn({ data: clean });
        return { id: values.id! };
      } else {
        const row = await createFn({ data: clean });
        return { id: (row as any).id };
      }
    },
    onSuccess: (r) => { onSaved?.(r.id); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <form onSubmit={handleSubmit((v) => submit.mutate(v))} className="space-y-6">
      <Section title="Basics">
        <Grid>
          <Field label="First name" required>
            <Input {...register("first_name", { required: true })} />
          </Field>
          <Field label="Last name" required>
            <Input {...register("last_name", { required: true })} />
          </Field>
          <Field label="Middle name"><Input {...register("middle_name")} /></Field>
          <Field label="Suffix"><Input {...register("suffix")} placeholder="Jr., III" /></Field>
          <Field label="Sex">
            <Controller name="sex" control={control} render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </Field>
          <Field label="Birthdate"><Input type="date" {...register("birthdate")} /></Field>
          <Field label="Civil status">
            <Controller name="civil_status" control={control} render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {["single","married","widowed","separated","divorced"].map((s) => (
                    <SelectItem key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </Field>
        </Grid>
      </Section>

      <Section title="Contact">
        <Grid>
          <Field label="Email"><Input type="email" {...register("email")} /></Field>
          <Field label="Phone"><Input {...register("phone")} /></Field>
          <Field label="Address" full><Textarea rows={2} {...register("address")} /></Field>
        </Grid>
      </Section>

      <Section title="Membership">
        <Grid>
          <Field label="Church" required>
            <Controller name="church_id" control={control} rules={{ required: true }} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {churches.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </Field>
          <Field label="Status">
            <Controller name="membership_status" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["visitor","regular","member","inactive","transferred"].map((s) => (
                    <SelectItem key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </Field>
          <Field label="Joined"><Input type="date" {...register("joined_at")} /></Field>
          <Field label="Baptism date"><Input type="date" {...register("baptism_date")} /></Field>
          <Field label="Baptism church" full><Input {...register("baptism_church")} /></Field>
          <Field label="Wedding date"><Input type="date" {...register("wedding_date")} /></Field>
        </Grid>
      </Section>

      <Section title="Notes">
        <Textarea rows={4} {...register("notes")} placeholder="Any pastoral notes…" />
      </Section>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={isSubmitting || submit.isPending}>
          {(isSubmitting || submit.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {editing ? "Save changes" : "Create member"}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="border border-border rounded-lg bg-card p-4">{children}</div>
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}
function Field({ label, required, full, children }: { label: string; required?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={"space-y-1.5 " + (full ? "md:col-span-2" : "")}>
      <Label className="text-[12px]">{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}
