import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyContext } from "@/modules/tenancy/tenancy.functions";

export function useMyContext() {
  const fn = useServerFn(getMyContext);
  return useQuery({
    queryKey: ["me-context"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}
