export function contentSecurityPolicy(nonce: string, production: boolean) {
  return [
    "default-src 'self'",
    production ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'` : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'", // Existing React and animation styles.
    "img-src 'self' data: blob:", "font-src 'self'",
    production ? "connect-src 'self'" : "connect-src 'self' ws: wss:",
    "frame-src 'self'", "frame-ancestors 'self'", "object-src 'none'",
    "base-uri 'self'", "form-action 'self'",
  ].join("; ");
}

export const browserSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];
