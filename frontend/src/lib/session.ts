// Session cache: `me` lives in the ["me"] query; beginSession/endSession keep the cache honest.
import { useQuery } from "@tanstack/react-query";
import { ApiError, apiGet, apiPost } from "./api";
import { queryClient } from "./queryClient";
import type { MessageOut, UserOut } from "./types";

export async function fetchMe(): Promise<UserOut | null> {
  try {
    return await apiGet<UserOut>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function useMe() {
  return useQuery<UserOut | null>({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 60_000,
    retry: false,
  });
}

// Call right after a successful login/register: re-fetch every query with the new cookie.
export function beginSession() {
  void queryClient.invalidateQueries();
}

// Every sign-out control must go through here: wipes the cache so the next
// login on this browser never sees the previous account's data.
export async function endSession() {
  try {
    await apiPost<MessageOut>("/auth/logout");
  } finally {
    queryClient.clear();
  }
}
