import { useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, ChevronsUpDown, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCurrentChurch } from "@/hooks/use-current-church";
import type { MyContext } from "@/modules/tenancy/tenancy.functions";
import { useQueryClient } from "@tanstack/react-query";

export function Topbar({ ctx }: { ctx: MyContext }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currentChurchId, setCurrentChurchId, churches, currentChurch } = useCurrentChurch();
  const org = ctx.organizations[0];

  const initials = useMemo(() => {
    const n = ctx.user.full_name ?? ctx.user.email ?? "?";
    return n
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [ctx.user]);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="h-14 border-b border-border bg-background flex items-center gap-2 px-4">
      <div className="flex items-center gap-2 min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground truncate">
          {org?.name ?? "—"}
        </div>
        <span className="text-muted-foreground/40">/</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-[13px] font-medium">
              {currentChurchId
                ? (currentChurch?.name ?? "Church")
                : `All Churches (${churches.length})`}
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-1">
            <button
              onClick={() => setCurrentChurchId(null)}
              className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-accent text-left"
            >
              <Check className={"h-3.5 w-3.5 " + (currentChurchId === null ? "" : "opacity-0")} />
              <span className="flex-1">All Churches</span>
              <span className="text-[11px] text-muted-foreground tabular">{churches.length}</span>
            </button>
            <div className="my-1 border-t border-border" />
            <div className="max-h-64 overflow-auto">
              {churches.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCurrentChurchId(c.id)}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-accent text-left"
                >
                  <Check
                    className={"h-3.5 w-3.5 " + (currentChurchId === c.id ? "" : "opacity-0")}
                  />
                  <span className="flex-1 truncate">{c.name}</span>
                  {c.city && <span className="text-[11px] text-muted-foreground">{c.city}</span>}
                </button>
              ))}
              {churches.length === 0 && (
                <div className="px-2 py-3 text-[12px] text-muted-foreground">
                  No churches yet.{" "}
                  <Link to="/settings/churches" className="underline">
                    Create one
                  </Link>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
              <div className="h-6 w-6 rounded-full bg-foreground text-background grid place-items-center text-[10px] font-semibold">
                {initials}
              </div>
              <span className="hidden sm:inline text-[13px] text-muted-foreground">
                {ctx.user.full_name ?? ctx.user.email}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="text-[13px] font-medium truncate">{ctx.user.full_name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{ctx.user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings/profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
