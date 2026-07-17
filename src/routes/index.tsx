import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Users,
  Wallet,
  GraduationCap,
  HeartHandshake,
  Building2,
  ClipboardList,
  CalendarCheck2,
  Package,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shekinah Glory Baptist Church — Centralized Church Management" },
      {
        name: "description",
        content:
          "Run all your churches from one calm, modern dashboard. Membership, finance, ministry, events, and more.",
      },
      {
        property: "og:title",
        content: "Shekinah Glory Baptist Church — Centralized Church Management",
      },
      { property: "og:description", content: "Run all your churches from one calm, modern dashboard. Membership, finance, ministry, events, and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const nav = useNavigate();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const modules = [
    { icon: Users, label: "Membership" },
    { icon: Wallet, label: "Finance" },
    { icon: GraduationCap, label: "Sunday School" },
    { icon: HeartHandshake, label: "Discipleship" },
    { icon: Sparkles, label: "Ministry" },
    { icon: ClipboardList, label: "Committee" },
    { icon: Building2, label: "Visitation" },
    { icon: CalendarCheck2, label: "Events" },
    { icon: Package, label: "Inventory" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="h-14 border-b border-border flex items-center px-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-foreground text-background grid place-items-center text-[10px] font-semibold">
            SGBC
          </div>
          <div className="text-sm font-semibold tracking-tight">Shekinah Glory Baptist Church</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {signedIn ? (
            <Button size="sm" onClick={() => nav({ to: "/dashboard" })}>
              Open dashboard <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <section className="max-w-3xl mx-auto text-center px-6 pt-24 pb-16">
        <div className="inline-block text-[11px] uppercase tracking-wider text-muted-foreground border border-border rounded-full px-3 py-1 mb-6">
          Multi-church SaaS · Built for Shekinah Glory Baptist Churches
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Centralized platform for Shekinah Glory Baptist Church.
        </h1>
        <p className="text-muted-foreground mt-4 text-base max-w-xl mx-auto">
          Membership, finance, ministry, and events — centralized, spacious, and simple enough that
          a first-time administrator can just get started.
        </p>
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button size="lg" asChild>
            <Link to="/auth">
              Register <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
        <div className="mt-4">
          <Button size="sm" variant="ghost" asChild>
            <Link to="/event-register">Attendee event registration (no login)</Link>
          </Button>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-3 md:grid-cols-3 gap-2">
          {modules.map(({ icon: Icon, label }) => (
            <div key={label} className="border border-border rounded-lg p-4 bg-card">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div className="text-[13px] font-medium mt-2">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 text-[12px] text-muted-foreground flex items-center justify-between">
          <div>© {new Date().getFullYear()} Shekinah Glory Baptist Church</div>
          <div>Built by ITM SGBC</div>
        </div>
      </footer>
    </div>
  );
}
