import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CurrentChurchProvider } from "@/hooks/use-current-church";
import { useMyContext } from "@/hooks/use-my-context";
import { Loader2 } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useMyContext();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-destructive p-6 text-center">
        Failed to load workspace. {error?.message ?? ""}
      </div>
    );
  }

  return (
    <CurrentChurchProvider churches={data.churches}>
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar ctx={data} />
          <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
        </div>
      </div>
    </CurrentChurchProvider>
  );
}
