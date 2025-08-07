import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "~/lib/api-endpoints";
import { getRequest } from "~/lib/http";
import type { WhoAmIResponse } from "./types";

export function useWhoAmI() {
  return useQuery({
    queryKey: ["whoami"],
    queryFn: async () => {
      return getRequest<WhoAmIResponse>({
        url: API_ENDPOINTS.USER.PROFILE,
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
