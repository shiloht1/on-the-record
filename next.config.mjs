// GitHub Pages serves a *project* repo from https://user.github.io/REPO/, so
// every asset and link needs that prefix or the site loads unstyled with broken
// navigation. Set BASE_PATH=/REPO before building in that case.
//
// Not needed for: drag-and-drop hosts (Netlify, Cloudflare Pages), custom
// domains, or a repo named ACCOUNT.github.io — all of which serve from the root.
const basePath = process.env.BASE_PATH || ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath || undefined,

  // Fully static export. There is no server, therefore there is no server that
  // could log a visitor's address even by accident. See lib/geocode.ts.
  output: 'export',
  images: { unoptimized: true },

  // Security headers live in vercel.json — Next's headers() is ignored under
  // `output: 'export'` because there is no server to apply them.
}

export default nextConfig
