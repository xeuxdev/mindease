import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "~/lib/api-endpoints";
import { getRequest } from "~/lib/http";
import type { WhoAmIResponse } from "./types";

const STORAGE_KEY = "mindease_user_data";

// Helper function to get cached user data from localStorage
function getCachedUserData(): WhoAmIResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

// Helper function to cache user data to localStorage
function setCachedUserData(data: WhoAmIResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useWhoAmI() {
  const cachedData = getCachedUserData();

  return useQuery({
    queryKey: ["whoami"],
    queryFn: async () => {
      const response = await getRequest<WhoAmIResponse>({
        url: API_ENDPOINTS.USER.PROFILE,
      });
      // Cache the new data
      setCachedUserData(response);
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    initialData: cachedData || undefined,
  });
}
