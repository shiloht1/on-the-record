/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Fully static export. There is no server, therefore there is no server that
  // could log a visitor's address even by accident. See lib/geocode.ts.
  output: 'export',
  images: { unoptimized: true },

  // Security headers live in vercel.json — Next's headers() is ignored under
  // `output: 'export'` because there is no server to apply them.
}

export default nextConfig
