import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getAvailableOrganizations } from "@/modules/auth/auth.public.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Shekinah Glory Baptist Church" },
      {
        name: "description",
        content: "Sign in to Shekinah Glory Baptist Church to manage your churches.",
      },
    ],
  }),
  validateSearch: (search: Record<string, any>) => ({
    mode: (search.mode ?? "signin") as "signin" | "signup" | "forgot",
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const getOrganizationsFn = useServerFn(getAvailableOrganizations);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [busy, setBusy] = useState(false);

  // Fetch available organizations
  const { data: organizationsData, isLoading: orgsLoading } = useQuery({
    queryKey: ["available-organizations"],
    queryFn: () => getOrganizationsFn(undefined),
    staleTime: 60_000, // Cache for 1 minute
  });

  const organizations = organizationsData?.organizations ?? [];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed", { description: (result.error as Error).message });
      setBusy(false);
      return;
    }
    if (result.redirected) return;

    // Wait for session to be fully established
    let retries = 0;
    const maxRetries = 10;
    let sessionReady = false;

    while (!sessionReady && retries < maxRetries) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        sessionReady = true;
        break;
      }
      retries++;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!sessionReady) {
      toast.error("Session failed to initialize", { description: "Please try signing in again." });
      setBusy(false);
      return;
    }

    navigate({ to: "/dashboard", replace: true });
  }

  function getErrorMessage(err: any): string {
    // Log the full error for debugging
    console.error("[Auth Error]", {
      message: err?.message,
      status: err?.status,
      error: err?.error,
      error_description: err?.error_description,
      code: err?.code,
      hint: err?.hint,
      details: err?.details,
      fullError: err,
    });

    // Handle Supabase auth errors
    if (err?.message) return err.message;
    if (err?.error_description) return err.error_description;
    if (err?.error) return err.error;
    if (err?.hint) return err.hint;
    if (err?.details) return err.details;
    if (typeof err === "string") return err;
    if (typeof err === "object" && Object.keys(err).length === 0) {
      return "An error occurred. If you see an empty error, the issue might be with the database. Please contact support if this persists.";
    }
    return "Something went wrong";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (search.mode === "signup") {
        if (!orgName) {
          throw new Error("Please select an organization");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, organization_name: orgName },
          },
        });
        if (error) throw error;
        toast.success("Account created successfully!", {
          description: "Check your email to verify your account. Redirecting...",
        });
        // Give user time to see the success message before navigating
        setTimeout(() => {
          navigate({ to: "/dashboard", replace: true });
        }, 2000);
      } else if (search.mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Wait for session to be fully established
        let retries = 0;
        const maxRetries = 10;
        let sessionReady = false;

        while (!sessionReady && retries < maxRetries) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            sessionReady = true;
            break;
          }
          retries++;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (!sessionReady) {
          throw new Error("Session failed to initialize. Please try signing in again.");
        }

        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Reset link sent", { description: "Check your inbox." });
        navigate({ search: { mode: "signin" }, replace: true });
      }
    } catch (err: any) {
      const message = getErrorMessage(err);
      toast.error("Error", { description: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-7 w-7 rounded-md bg-foreground text-background grid place-items-center text-[11px] font-semibold">
            SGBC
          </div>
          <div className="text-base font-semibold tracking-tight">
            Shekinah Glory Baptist Church
          </div>
        </div>

        <div className="border border-border rounded-lg bg-card p-6">
          <h1 className="text-lg font-semibold tracking-tight">
            {search.mode === "signup"
              ? "Signup"
              : search.mode === "forgot"
                ? "Reset password"
                : "Sign in"}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {search.mode === "signup"
              ? "Set up your account."
              : search.mode === "forgot"
                ? "We'll email you a reset link."
                : "Welcome back."}
          </p>

          {search.mode !== "forgot" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-6 h-9"
                onClick={handleGoogle}
                disabled={busy}
              >
                <GoogleIcon /> Continue with Google
              </Button>
              <div className="flex items-center gap-2 my-4 text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="flex-1 border-t border-border" />
                or
                <div className="flex-1 border-t border-border" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {search.mode === "signup" && (
              <>
                <Field label="Full name">
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </Field>
                <Field label="Which Church?" hint="You can add churches after signup.">
                  <Select value={orgName} onValueChange={setOrgName}>
                    <SelectTrigger disabled={orgsLoading}>
                      <SelectValue
                        placeholder={orgsLoading ? "Loading..." : "Select your church"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.name}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </>
            )}
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Field>
            {search.mode !== "forgot" && (
              <Field label="Password">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={search.mode === "signup" ? "new-password" : "current-password"}
                />
              </Field>
            )}
            <Button
              type="submit"
              className="w-full h-9"
              disabled={busy || (search.mode === "signup" && (orgsLoading || !orgName))}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {search.mode === "signup"
                ? "Signup"
                : search.mode === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-[12px] text-muted-foreground">
            {search.mode === "signin" ? (
              <>
                <button
                  className="hover:text-foreground"
                  onClick={() => navigate({ search: { mode: "forgot" } })}
                >
                  Forgot password?
                </button>
                <button
                  className="hover:text-foreground"
                  onClick={() => navigate({ search: { mode: "signup" } })}
                >
                  Create account
                </button>
              </>
            ) : (
              <button
                className="hover:text-foreground"
                onClick={() => navigate({ search: { mode: "signin" } })}
              >
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-4">
          <Link to="/" className="hover:text-foreground">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px]">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.56-2.77c-.99.67-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.52H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.12A6.6 6.6 0 0 1 5.48 12c0-.74.13-1.45.36-2.12V7.04H2.18a11 11 0 0 0 0 9.92l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.2 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
