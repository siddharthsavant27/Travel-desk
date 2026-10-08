// Reflective lookup prevents Turbopack's property-access optimization from
// freezing this server security setting into the build's NEXT_PUBLIC_* value.
// Docker sets the external origin at runtime.
export function configuredAppUrl() {
  return Reflect.get(process.env, "NEXT_PUBLIC_APP_URL") as string | undefined;
}
export function appOrigin(requestUrl: string) {
  const request = new URL(requestUrl);
  // Local development can move to another port when Docker occupies the
  // configured port. Still require the exact request origin, never a wildcard.
  if (process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "[::1]"].includes(request.hostname)) return request.origin;
  return new URL(configuredAppUrl() || requestUrl).origin;
}
