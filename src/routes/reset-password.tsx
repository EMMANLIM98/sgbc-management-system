import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Church OS" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    nav({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-background">
      <form onSubmit={submit} className="w-full max-w-sm border border-border rounded-lg p-6 space-y-4 bg-card">
        <h1 className="text-lg font-semibold">Set a new password</h1>
        <div className="space-y-1.5">
          <Label className="text-[12px]">New password</Label>
          <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>Update password</Button>
      </form>
    </div>
  );
}
