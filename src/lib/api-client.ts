export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, cache: "no-store" });
  const data = await response
    .json()
    .catch(() => ({
      error: "The server returned an unexpected response. Please try again.",
    }));
  if (response.status === 401) {
    // A full navigation clears stale account data after session revocation.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(
      `/login?expired=true&from=${encodeURIComponent(window.location.pathname + window.location.search)}`,
    );
    throw new Error("Your session has ended. Sign in again to continue.");
  }
  if (!response.ok)
    throw new Error(
      data.error || "Unable to complete the request. Please try again.",
    );
  return data as T;
}
export function jsonBody(body: unknown, method = "POST"): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
