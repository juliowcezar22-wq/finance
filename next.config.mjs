/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";

// CSP inicial em REPORT-ONLY: não bloqueia (não quebra a UI redesenhada).
// Violações são coletadas em /api/csp-report (feature 011) como logs
// estruturados; com dados reais, a CSP é promovida a enforce. 'unsafe-inline' cobre estilos/scripts inline do Next.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https:",
  "report-uri /api/csp-report",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: csp },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // URLs antigas (rotas-stub removidas na 008) continuam resolvendo.
  async redirects() {
    return [
      { source: "/faturas", destination: "/importar", permanent: false },
      { source: "/fluxo-de-caixa", destination: "/dashboard", permanent: false },
      { source: "/receber", destination: "/pessoas", permanent: false },
    ];
  },
};

export default nextConfig;
